import { App, Editor, MarkdownView, Modal, Notice, Plugin, Menu, MenuItem, PluginSettingTab, Setting, AbstractInputSuggest, TFolder, TFile, normalizePath } from 'obsidian';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, copyFile } from 'fs';
import { join, basename, extname } from 'path';
import { simpleParser, ParsedMail } from 'mailparser';
import * as path from 'path';
import { nanoid } from 'nanoid';
import { error } from 'console';
import { ExtNoteManager } from './ExtNoteManager';

interface CreateNoteSettings {
	inputFolderPath: string;
	noteFolderPath: string;
	attachementFolderPath: string;
	useTemplate: boolean;
	templateFolderPath: string;
	importTemplate: string;
	deleteEmlFiles: boolean;
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
	deleteEmlFiles: true,
	attachEmlFile: true,
	ignoreHiddenFiles: true
}

export default class createNotePlugin extends Plugin {
	settings: CreateNoteSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Import Files', (evt: MouseEvent) => {
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

		// Register a command to rename selected notes
		this.addCommand({
			id: 'rename-selected-notes-with-date',
			name: 'Rename selected notes with create-date prefix',
			callback: async () => {
				try {
					const activeFile = this.app.workspace.getActiveFile();
					if (!activeFile) {
						new Notice('No active note found');
						return;
					}
					const extNoteMgr = new ExtNoteManager(this.app, this.settings);
					await extNoteMgr.renameNoteWithCreatedDate(activeFile);
				}
				catch (error) {
					new Notice('Error changing note name')
					console.error('Error changing note name:', error);
				}
			}
		});

		// Register for file menu (context menu)
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu: Menu, file: TFile) => {
				// Only show for markdown files
				if (file instanceof TFile && file.extension === 'md') {
					menu.addItem((item: MenuItem) => {
						item
							.setTitle('Rename with created date')
							.setIcon('dice')
							.onClick(async () => {
								const extNoteMgr = new ExtNoteManager(this.app, this.settings);
								await extNoteMgr.renameNoteWithCreatedDate(file);
							});
					});
				}
			})
		);

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

function getFormattedISODate(): string {
	const date = new Date();

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0'); // Add 1 because months are 0-indexed
	const day = String(date.getDate()).padStart(2, '0');

	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');

	const isoDate = `${year}-${month}-${day} ${hours}:${minutes}`;

	return isoDate;
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
			});


		// set initial state
		const enabled = this.plugin.settings.useTemplate === true;
		inputArray.forEach(input => input.disabled = !enabled);

	}
}

