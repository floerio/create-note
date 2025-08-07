import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, AbstractInputSuggest, TFolder, normalizePath } from 'obsidian';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, copyFile } from 'fs';
import { join, basename, extname } from 'path';
// import { copy } from 'fs-extra';

interface CreateNoteSettings {
	inputFolderPath: string;
	noteFolderPath: string;
	attachementFolderPath: string;
}

const DEFAULT_SETTINGS: CreateNoteSettings = {
	inputFolderPath: '_input',
	noteFolderPath: '_unsortiert',
	attachementFolderPath: '_unsortiert/_files'
}

export default class createNotePlugin extends Plugin {
	settings: CreateNoteSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Import Files', (evt: MouseEvent) => {
			this.processFiles();
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		/*
		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		*/

		/*
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		*/

		/*
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});
		*/
		
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new CreateNoteSettingTab(this.app, this));
		
		
		/*
		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});
		*/
		
		/*
		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
		*/
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	//
	// get all files and call the process function for each file
	// 
	async processFiles() {
		try {
			// Check if required folders exisit
			if (!await this.ensureAllFoldersExist(this.settings)) {
				new Notice('Import aborted');
				return;
			}

			// get base path for the vault
			const basePath = normalizePath((this.app.vault.adapter as any).basePath);
			
			const inputFolderPath = basePath + normalizePath('/' + this.settings.inputFolderPath);
			const files = readdirSync(inputFolderPath);
			console.error('List of files:' + files)
			let processedCount = 0;

			// handle each file
			for (const file of files) {
				const filePath = join(inputFolderPath, file);

				// Skip directories
				if (statSync(filePath).isDirectory()) continue;

				// Process the file
				await this.processFile(filePath, file, basePath);
				processedCount++;
			}
			
			new Notice(`Processed ${processedCount} files`);

		} catch (error) {
			console.error('Error processing files:', error);
			new Notice(`Error: ${error.message}`);
		}
	}
	 async processFile(filePath: string, fileName: string, basePath: string) {
        // Generate a safe note title from filename (removing extension)

       
        try {
            // first move the file to the attachments folder
			const fileToRename = this.app.vault.getFileByPath(filePath);
            const targetFilePath = `${basePath}/${this.settings.attachementFolderPath}/${fileName}`;
			await this.app.vault.rename(fileToRename,targetFilePath)
           

			/*

			// prepare names for note and its path
			const noteTitle = basename(fileName, extname(fileName)).replace(/[^\w\s-]/g, '');
        	const notePath = `${basePath}/${this.settings.noteFolderPath}/${noteTitle}.md`;

			// Create note content with template and file link
            const noteContent = this.createNoteContent(fileName, noteTitle);

            // Create the note file in vault
            await this.app.vault.create(notePath, noteContent);
			*/

            new Notice(`Created note for: ${fileName}`);
        } catch (error) {
            console.error(`Error processing file ${fileName}:`, error);
            new Notice(`Error processing ${fileName}: ${error.message}`);
        }
    }


	async ensureAllFoldersExist(mySettings: CreateNoteSettings): Promise<boolean> {

		if (!await this.app.vault.adapter.exists(mySettings.attachementFolderPath)) {
			new Notice(`Folder ${mySettings.attachementFolderPath} does not exists`);
			return false;
		}

		if (!await this.app.vault.adapter.exists(mySettings.inputFolderPath)) {
			new Notice(`Folder ${mySettings.inputFolderPath} does not exists`);
			return false;
		}

		if (!await this.app.vault.adapter.exists(mySettings.noteFolderPath)) {
			new Notice(`Folder ${mySettings.noteFolderPath} does not exists`);
			return false;
		}

		return true;
	}

}

/*
class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
	
*/

class FolderSuggest extends AbstractInputSuggest<TFolder> {
	constructor(app: App, private inputEl: HTMLInputElement) {
		super(app, inputEl);
	}

	// Called when suggestions need to be calculated
	getSuggestions(inputStr: string): TFolder[] {
		const folders: TFolder[] = [];
		ObsidianVaultTraversal(this.app.vault.getRoot(), folders);
		return folders.filter(folder => folder.path.toLowerCase().includes(inputStr.toLowerCase()));
	}

	// Renders a suggestion item
	renderSuggestion(folder: TFolder, el: HTMLElement) {
		el.setText(folder.path);
	}

	// Sets the value to the input on selection
	selectSuggestion(folder: TFolder) {
		this.inputEl.value = folder.path;
		this.inputEl.trigger("input");
		this.close();
	}
}

// Helper function to recursively gather all folders in the vault
function ObsidianVaultTraversal(folder: TFolder, result: TFolder[]) {
	result.push(folder);
	for (const child of folder.children) {
		if (child instanceof TFolder) {
			ObsidianVaultTraversal(child, result);
		}
	}
}

class CreateNoteSettingTab extends PluginSettingTab {
	plugin: createNotePlugin;

	constructor(app: App, plugin: createNotePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Input Folder")
			.setDesc("Folder with new files")
			.addText(text => {
				text.inputEl.placeholder = "Start typing to search folders";
				text.setValue(this.plugin.settings.inputFolderPath ?? "");
				new FolderSuggest(this.app, text.inputEl);

				// Save selected folder to settings
				text.onChange(async (value) => {
					this.plugin.settings.inputFolderPath = value;
					await this.plugin.saveSettings();
				});
			});
		new Setting(containerEl)
			.setName("Note Folder")
			.setDesc("Folder where new notes are placed")
			.addText(text => {
				text.inputEl.placeholder = "Start typing to search folders";
				text.setValue(this.plugin.settings.noteFolderPath ?? "");
				new FolderSuggest(this.app, text.inputEl);

				// Save selected folder to settings
				text.onChange(async (value) => {
					this.plugin.settings.noteFolderPath = value;
					await this.plugin.saveSettings();
				});
			});
		new Setting(containerEl)
			.setName("Attachement folder")
			.setDesc("Folder where attachements are stored")
			.addText(text => {
				text.inputEl.placeholder = "Start typing to search folders";
				text.setValue(this.plugin.settings.attachementFolderPath ?? "");
				new FolderSuggest(this.app, text.inputEl);

				// Save selected folder to settings
				text.onChange(async (value) => {
					this.plugin.settings.attachementFolderPath = value;
					await this.plugin.saveSettings();
				});
			});
	}
}


