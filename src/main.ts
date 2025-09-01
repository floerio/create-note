import { App, Notice, Plugin, Menu, MenuItem, PluginSettingTab, Setting, AbstractInputSuggest, TFolder, TFile, addIcon } from 'obsidian';
import { ExtNoteManager } from './ExtNoteManager';

interface CreateNoteSettings {
	inputFolderPath: string;
	noteFolderPath: string;
	attachementFolderPath: string;
	useTemplate: boolean;
	templateFolderPath: string;
	importTemplate: string;
	attachEmlFile: boolean;
	ignoreHiddenFiles: boolean;
}

const DEFAULT_SETTINGS: CreateNoteSettings = {
	inputFolderPath: '_input',
	noteFolderPath: '_unsortiert',
	attachementFolderPath: '_unsortiert/_files',
	useTemplate: true,
	templateFolderPath: '_templates',
	importTemplate: 'createNoteTemplate.md',
	attachEmlFile: true,
	ignoreHiddenFiles: true
}

export default class createNotePlugin extends Plugin {
	settings: CreateNoteSettings;

	async onload() {
		await this.loadSettings();

		addIcon(
			"ext-note-manager-icon",
			`<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"> 
			<g>
        		<circle cx="8.816" cy="7.01" r="2.009" transform="matrix(9.422,0,0,9.422,-59.1345,-43.8815)" fill="currentColor"/> 
				</g>
    		<g>
        		<path d="M8.402,16.504L13.775,11.131L19.136,16.491L8.402,16.504Z" transform="matrix(4.87232,0,0,7.55187,3.17546,-70.2489)" fill="currentColor"/>
				</g>
    		<g>
        		<rect x="4.115" y="15.733" width="7.288" height="6.383" transform="matrix(5.46895,0,0,5.26372,5.38211,-18.3902)" fill="currentColor"/>
				</g>
			</svg>`
		)

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('ext-note-manager-icon', 'Import Files', (evt: MouseEvent) => {
			// this.processFiles();
			try {
				const extNoteMgr = new ExtNoteManager(this.app, this.settings);
				extNoteMgr.createNotesForFiles();
			}
			catch (error) {
				new Notice('Unable to process file')
				console.error('Could not process file', error);
			}

		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new CreateNoteSettingTab(this.app, this));


	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
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

class CreateNoteSettingTab extends PluginSettingTab {
	plugin: createNotePlugin;

	folders: { path: string, folder: TFolder }[] = [];


	constructor(app: App, plugin: createNotePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	collectFolders(folder: TFolder) {
		// Don't include root folder in the list for cleaner UI
		if (folder.path !== '/') {
			this.folders.push({ path: folder.path, folder });
		}

		folder.children.forEach(child => {
			if (child instanceof TFolder) {
				this.collectFolders(child);
			}
		});
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

		new Setting(containerEl)
			.setName("Ignore hidden files?")
			.setDesc("Enable if you want to ignore .name files in the import folder")
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.ignoreHiddenFiles ?? "")
				toggle.onChange(async (value) => {
					this.plugin.settings.ignoreHiddenFiles = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Add eml file to new note?")
			.setDesc("Enable if you want to attache the original eml file to the note")
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.attachEmlFile ?? "")
				toggle.onChange(async (value) => {
					this.plugin.settings.attachEmlFile = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Use template?")
			.setDesc("Enable if you want to use a template for the new note")
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.useTemplate ?? "")
				toggle.onChange(async (value) => {
					this.plugin.settings.useTemplate = value;
					await this.plugin.saveSettings();
					inputArray.forEach(input => input.disabled = !value);
					this.display();
				});
			});

		new Setting(containerEl)
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

				// change state
				if (!this.plugin.settings.useTemplate) {
					text.inputEl.style.backgroundColor = "#e0e0e0";
					text.inputEl.style.opacity = "1";
				} else {
					text.inputEl.style.backgroundColor = "";
					text.inputEl.style.opacity = "";
				}

				inputArray.push(text.inputEl);
			});

		new Setting(containerEl)
			.setName("Template")
			.setDesc("The template to be used when creating the note")
			.addText(text => {
				text.inputEl.placeholder = "Name of template";
				text.setValue(this.plugin.settings.importTemplate ?? "");

				// Save template name to settings
				text.onChange(async (value) => {
					this.plugin.settings.importTemplate = value;
					await this.plugin.saveSettings();
				});

				// change state
				if (!this.plugin.settings.useTemplate) {
					text.inputEl.style.backgroundColor = "#e0e0e0";
					text.inputEl.style.opacity = "1";
				} else {
					text.inputEl.style.backgroundColor = "";
					text.inputEl.style.opacity = "";
				}

				inputArray.push(text.inputEl);
			})

		// set initial state
		const enabled = this.plugin.settings.useTemplate === true;
		inputArray.forEach(input => input.disabled = !enabled);

	}
}

