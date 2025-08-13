import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, AbstractInputSuggest, TFolder, TFile, normalizePath } from 'obsidian';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, copyFile } from 'fs';
import { join, basename, extname } from 'path';
import { simpleParser, ParsedMail } from 'mailparser';
import * as path from 'path';
import { nanoid } from 'nanoid';
import { error } from 'console';

interface CreateNoteSettings {
	inputFolderPath: string;
	noteFolderPath: string;
	attachementFolderPath: string;
	useTemplate: boolean;
	templateFolderPath: string;
	importTemplate: string;
	deleteEmlFiles: boolean;
}

const DEFAULT_SETTINGS: CreateNoteSettings = {
	inputFolderPath: '_input',
	noteFolderPath: '_unsortiert',
	attachementFolderPath: '_unsortiert/_files',
	useTemplate: true,
	templateFolderPath: '_templates',
	importTemplate: 'createNoteTemplate.md',
	deleteEmlFiles: true
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
			let processedCount = 0;

			// handle each file
			for (const file of files) {
				const inputFile = join(inputFolderPath + "/", file);

				// Skip directories
				if (statSync(inputFile).isDirectory()) continue;

				let ext = path.extname(inputFile);

				switch (ext) {
					case ".eml":
						await this.processEmlFile(file, basePath)
						break;

					case ".md":
						continue;

					default:
						await this.processStandardFile(file, basePath);;
				}

				processedCount++;
			}

			new Notice(`Processed ${processedCount} files`);

		} catch (error) {
			console.error('Error processing files:', error);
			new Notice(`Error: ${error.message}`);
		}
	}

	//
	// process EML file: move it, split the content with files and create note for it
	//
	async processEmlFile(fileName: string, basePath: string) {

		const sourceFile = join(this.settings.inputFolderPath + "/", fileName);
		// const targetFile = join(this.settings.attachementFolderPath + "/", fileName);

		try {
			// Generate a safe note title from filename (removing extension)
			const noteTitle = this.createNameForNote(fileName);

			//
			// Read eml file content and process it
			//

			const emlInputFile = this.app.vault.getAbstractFileByPath(sourceFile);
			if (!(emlInputFile instanceof TFile)) {
				throw new Error(`Can't read eml file: ${sourceFile}`);
			}

			// read the file
			const emlBuffer = await this.app.vault.readBinary(emlInputFile);
			const nodeBuffer = Buffer.from(emlBuffer); // Node.js Buffer

			// Parse the content
			const parsed: ParsedMail = await simpleParser(nodeBuffer);

			// uid for note and its files
			const uuid = nanoid();

			// create the content of the note: blank or by using a template
			let noteContent = "";

			// check if template is set
			if (this.settings.useTemplate) {
				// Create note content with template 
				noteContent = await this.createNoteContent(uuid);
			}

			noteContent += `**Subject: ${parsed.subject || 'No Subject'}**\n\n${parsed.text}\n`;

			//
			// Save attachments to specified folder
			//

			if (parsed.attachments && parsed.attachments.length > 0) {
				for (const attach of parsed.attachments) {

					// get file name and extension
					const filename = attach.filename || '';
					const ext = path.extname(filename);

					// only proceed if we have an extension, assuming that files w/o extension are no serious attachements
					if (ext) {
						const attachPath = normalizePath(`${this.settings.attachementFolderPath}/${uuid}_${filename}`);
						// Convert Buffer to ArrayBuffer using Uint8Array
						const arrayBuffer = new Uint8Array(attach.content).buffer;
						await this.app.vault.createBinary(attachPath, arrayBuffer as ArrayBuffer);
						noteContent += `\n\n![[${attachPath}]]`;
					}
				}
			}

			//
			// Finally create the note file in vault
			//

			// if it already exists, delete it first
			const existing = this.app.vault.getAbstractFileByPath(noteTitle);
			if (existing instanceof TFile) {
				await this.app.vault.delete(existing);
			}

			// create it
			await this.app.vault.create(noteTitle, noteContent);

			
			// delete input file if required
			if (this.settings.deleteEmlFiles) {
				await this.app.vault.delete(emlInputFile);
			}

			new Notice(`Created note for: ${fileName}`);

		} catch (error) {
			console.error(`Error processing file: `, error);
			new Notice(`Error processing ${fileName}: ${error.message}`);

		}
	}

	//
	// process standard file: move it and create note for it
	//
	async processStandardFile(fileName: string, basePath: string) {

		try {
			// uid for note and its files
			const uuid = nanoid();

			const sourceFile = join(this.settings.inputFolderPath + "/", fileName);
			const targetFile = join(this.settings.attachementFolderPath + "/", uuid + "_" + fileName);

			// first move the file to the attachments folder 
			await this.moveInputFile(sourceFile, targetFile);

			// Generate a safe note title from filename (removing extension)
			const noteNameWithPath = this.createNameForNote(fileName);

			// create the content of the note: blank or by using a template
			let noteContent = "";

			// check if template is set
			if (this.settings.useTemplate) {
				// Create note content with template 
				noteContent = await this.createNoteContent(uuid);
			}

			// add the file attachement link
			noteContent += `\n\n![[${targetFile}]]`;

			// Finally create the note file in vault
			await this.app.vault.create(noteNameWithPath, noteContent);

			new Notice(`Created note for: ${fileName}`);

		} catch (error) {
			console.error(`Error processing file: `, error);
			new Notice(`Error processing ${fileName}: ${error.message}`);
		}
	}

	createNameForNote(fileName: string): string {
		const noteTitle = createDatePrefix() + " " + basename(fileName, extname(fileName)).replace(/[^\w\s-]/g, '');
		return join(this.settings.noteFolderPath, noteTitle + ".md");
	}

	async moveInputFile(srcFile: string, targetFile: string) {
		try {
			const fileToRename = this.app.vault.getFileByPath(srcFile);
			if (!fileToRename) {
				throw new Error(`File not found: ${srcFile}`);
			}
			await this.app.vault.rename(fileToRename, targetFile);
		} catch (error) {
			console.error("File move failed: ", error);
			new Notice(`File move failed for ${srcFile}`);

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

	async createNoteContent(noteId: string): Promise<string> {
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

			// replace the template placeholder
			let newContent = content.replace(/%date%/g, formattedDate);
			newContent = newContent.replace(/%id%/g, noteId);

			// console.log("File:`\n" + newContent);

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

		// let inputTemplateEnabled: HTMLInputElement;
		new Setting(containerEl)
			.setName("Delete *.eml files?")
			.setDesc("Delete converted eml files?")
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.deleteEmlFiles ?? "")
				toggle.onChange(async (value) => {
					this.plugin.settings.deleteEmlFiles = value;
					await this.plugin.saveSettings();
				});
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


