import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, AbstractInputSuggest, TFolder, TFile, normalizePath } from 'obsidian';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, copyFile } from 'fs';
import { join, basename, extname } from 'path';
// import { copy } from 'fs-extra';

interface CreateNoteSettings {
	inputFolderPath: string;
	noteFolderPath: string;
	attachementFolderPath: string;
	useTemplate: boolean;
	templateFolderPath: string;
	importTemplate: string;
}

const DEFAULT_SETTINGS: CreateNoteSettings = {
	inputFolderPath: '_input',
	noteFolderPath: '_unsortiert',
	attachementFolderPath: '_unsortiert/_files',
	useTemplate: true,
	templateFolderPath: '_templates',
	importTemplate: 'createNoteTemplate.md'
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
			const basePath = (this.app.vault.adapter as any).basePath;

			const inputFolderPath = normalizePath(basePath + '/' + this.settings.inputFolderPath);
			const files = readdirSync(inputFolderPath);
			// console.log('List of files:' + files)
			let processedCount = 0;

			// handle each file
			for (const file of files) {
				const inputFile = join(inputFolderPath + "/", file);

				// Skip directories
				if (statSync(inputFile).isDirectory()) continue;

				// Process the file
				await this.processFile(file, basePath);
				processedCount++;
			}

			new Notice(`Processed ${processedCount} files`);

		} catch (error) {
			console.error('Error processing files:', error);
			new Notice(`Error: ${error.message}`);
		}
	}


	//
	// process one file: move it and create note for it
	//
	async processFile(fileName: string, basePath: string) {

		const sourceFile = join(this.settings.inputFolderPath + "/", fileName);
		const targetFile = join(this.settings.attachementFolderPath + "/", fileName);

		try {
			// first move the file to the attachments folder 
			const fileToRename = this.app.vault.getFileByPath(sourceFile);
			if (!fileToRename) {
				throw new Error(`File not found: ${sourceFile}`);
			}
			await this.app.vault.rename(fileToRename, targetFile);

			// Generate a safe note title from filename (removing extension)
			const noteTitle = createDatePrefix() + " " + basename(fileName, extname(fileName)).replace(/[^\w\s-]/g, '');
			const notePath = join(this.settings.noteFolderPath, noteTitle + ".md");

			// create the content of the note: blank or by using a template
			let noteContent = "";
			// check if template is set
			if (this.settings.useTemplate) {
				// Create note content with template and file link
				noteContent = await this.createNoteContent();
			}

			// add the file attachement link
			noteContent += `\n\n![[${targetFile}]]`;

			// Finally create the note file in vault
			await this.app.vault.create(notePath, noteContent);

			new Notice(`Created note for: ${fileName}`);

		} catch (error) {
			console.error(`Error processing file: `, error);
			new Notice(`Error processing ${fileName}: ${error.message}`);
		}
	}

	async ensureAllFoldersExist(mySettings: CreateNoteSettings): Promise<boolean> {

		// Array of [folderPath, errorMessage]
		const checks: [string, string][] = [
			[mySettings.attachementFolderPath, `Folder ${mySettings.attachementFolderPath} does not exist`],
			[mySettings.inputFolderPath, `Folder ${mySettings.inputFolderPath} does not exist`],
			[mySettings.noteFolderPath, `Folder ${mySettings.noteFolderPath} does not exist`],
			[mySettings.templateFolderPath, `Folder ${mySettings.templateFolderPath} does not exist`]
		];

		// If template should be used, add it to the checks array
		if (mySettings.useTemplate) {
			checks.push([
				`${mySettings.templateFolderPath}/${mySettings.importTemplate}`,
				`Template ${mySettings.importTemplate} does not exist`
			]);
		}

		for (const [path, msg] of checks) {
			if (!await this.app.vault.adapter.exists(path)) {
				new Notice(msg);
				return false;
			}
		}

		return true;

	}

	async createNoteContent(): Promise<string> {

		try {

			// get the template file
			const templateFileName = join(this.settings.templateFolderPath + "/", this.settings.importTemplate)
			const templateFile = this.app.vault.getFileByPath(templateFileName);

			// template found?
			if (!(templateFile instanceof TFile)) {
				throw new Error(`Template file not found: ${templateFileName}`);
			}

			// get the content of the template file
			const content = await this.app.vault.read(templateFile);
			//console.log("Template content:", JSON.stringify(content));

			// replace the tag placeholder
			const date = new Date();
			const formattedDate = date.toLocaleDateString('de-DE', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric'
			}); // German format: TT.MM.JJJJ

			let newContent = content.replace(/%date%/g, formattedDate);

			console.log("File:`\n" + newContent);

			return newContent;

		} catch (error) {
			console.error("Failed to create note content: ", error);
			new Notice("Unable to create note content");
			return '';
		}

	}

}

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

// helper fuction to create prefix string
function createDatePrefix(): string {
	// Create a new Date object
	const currentDate = new Date();

	// Get the year, month, and day components
	const year = currentDate.getFullYear();
	const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
	const day = String(currentDate.getDate()).padStart(2, '0');

	// Format the date as "YYYYMMDD"
	const formattedDate = `${year}${month}${day}`;

	return formattedDate;
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

		let inputArray: HTMLInputElement[] = [];

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

		// let inputTemplateEnabled: HTMLInputElement;
		new Setting(containerEl)
			.setName("Use template?")
			.setDesc("Use a template for the new note?")
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.useTemplate ?? "")
				toggle.onChange(async (value) => {
					this.plugin.settings.useTemplate = value;
					await this.plugin.saveSettings();
					inputArray.forEach(input => input.disabled = !value);
					updateDependentFields(!value);
				});
				// inputTemplateEnabled = toggle.toggleEl
			});


		let inputTemplateFolder: Setting;
		let inputTemplatePathElement: HTMLInputElement;
		inputTemplateFolder = new Setting(containerEl)
			.setName("Template folder")
			.setDesc("Folder where templates are stored")
			.addText(text => {
				text.inputEl.placeholder = "Start typing to search folders";
				text.setValue(this.plugin.settings.templateFolderPath ?? "");
				new FolderSuggest(this.app, text.inputEl);

				// Save selected folder to settings
				text.onChange(async (value) => {
					this.plugin.settings.templateFolderPath = value;
					await this.plugin.saveSettings();
				});
				inputArray.push(text.inputEl);
				inputTemplatePathElement = text.inputEl;
			});

		let inputTemplateName: Setting;
		let inputTemplateNameElement: HTMLInputElement;
		inputTemplateName = new Setting(containerEl)
			.setName("Template")
			.setDesc("Template to be used. Ignored if empty")
			.addText(text => {
				text.inputEl.placeholder = "Start typing to search for template";
				text.setValue(this.plugin.settings.importTemplate ?? "");
				// new FolderSuggest(this.app, text.inputEl);

				// Save selected folder to settings
				text.onChange(async (value) => {
					this.plugin.settings.importTemplate = value;
					await this.plugin.saveSettings();
				});
				inputArray.push(text.inputEl);
				inputTemplateNameElement = text.inputEl;
			});

		function updateDependentFields(disabled: boolean) {
			// Add/remove CSS class
			[inputTemplateFolder, inputTemplateName].forEach(setting => {
				setting.settingEl.classList.toggle("custom-disabled", disabled);
			});

			/*
			// Set disabled and tooltip state
			inputTemplateFolder.disabled = disabled;
			inputTemplateName.disabled = disabled;
			optionBInput.title = disabled
				? "Disabled because Option A is off" : "";
			optionCInput.title = disabled
				? "Disabled because Option A is off" : "";
			// Update descriptions for better UX
			optionBSetting.setDesc(
				disabled
					? "Disabled—enable Option A to activate."
					: "You can edit this field."
			);
			optionCSetting.setDesc(
				disabled
					? "Disabled—enable Option A to activate."
					: "You can edit this field."
			);*/
		}


		const enabled = this.plugin.settings.useTemplate === true;
		inputArray.forEach(input => input.disabled = !enabled);

		updateDependentFields(!this.plugin.settings.useTemplate);
	}


}


