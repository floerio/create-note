import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, normalizePath } from 'obsidian';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import { copy } from 'fs-extra';

interface FileScannerSettings {
    targetFolder: string;
    templateContent: string;
    fileExtensions: string;
}

export default class FileScanner extends Plugin {
    settings: FileScannerSettings;

    async onload() {
        await this.loadSettings();

        // Add a plugin settings tab
        this.addSettingTab(new FileScannerSettingTab(this.app, this));

        // Add a command to scan files from a directory
        this.addCommand({
            id: 'scan-files-and-create-notes',
            name: 'Scan Files and Create Notes',
            callback: async () => {
                // Show file picker to select source directory
                const sourcePath = await this.showDirectoryPicker();
                if (!sourcePath) {
                    new Notice('No directory selected');
                    return;
                }

                await this.processFiles(sourcePath);
            }
        });
    }

    async showDirectoryPicker(): Promise<string | null> {
        // This is a simplified version - in a real plugin you'd use a file system API
        // or Electron's dialog API to get a directory picker
        // For demonstration, we'll simulate it with a prompt
        const input = prompt("Enter the full path to the directory you want to scan:");
        return input || null;
    }

    async processFiles(sourcePath: string) {
        try {
            // Check if source path exists
            if (!existsSync(sourcePath)) {
                new Notice(`Source directory does not exist: ${sourcePath}`);
                return;
            }

            // Ensure target folder exists in vault
            const targetFolderPath = normalizePath(this.settings.targetFolder);
            await this.ensureFolderExists(targetFolderPath);

            // Get allowed extensions
            const allowedExtensions = this.settings.fileExtensions
                .split(',')
                .map(ext => ext.trim().toLowerCase())
                .filter(ext => ext.length > 0);

            // Read all files in the directory
            const files = readdirSync(sourcePath);
            let processedCount = 0;

            for (const file of files) {
                const filePath = join(sourcePath, file);
                
                // Skip directories
                if (statSync(filePath).isDirectory()) continue;
                
                // Check if file extension is allowed
                const fileExt = extname(file).toLowerCase().substring(1);
                if (allowedExtensions.length > 0 && !allowedExtensions.includes(fileExt)) {
                    continue;
                }

                // Process the file
                await this.processFile(filePath, file, targetFolderPath);
                processedCount++;
            }

            new Notice(`Processed ${processedCount} files`);

        } catch (error) {
            console.error('Error processing files:', error);
            new Notice(`Error: ${error.message}`);
        }
    }

    async processFile(filePath: string, fileName: string, targetFolderPath: string) {
        // Generate a safe note title from filename (removing extension)
        const noteTitle = basename(fileName, extname(fileName)).replace(/[^\w\s-]/g, '');
        const notePath = `${targetFolderPath}/${noteTitle}.md`;

        try {
            // Create target attachment folder if it doesn't exist
            const attachmentFolder = `${targetFolderPath}/attachments`;
            await this.ensureFolderExists(attachmentFolder);

            // Copy the file to the attachments folder
            const targetFilePath = `${attachmentFolder}/${fileName}`;
            await copy(filePath, this.app.vault.adapter.getFullPath(targetFilePath));

            // Create note content with template and file link
            const noteContent = this.createNoteContent(fileName, noteTitle);

            // Create the note file in vault
            await this.app.vault.create(notePath, noteContent);

            new Notice(`Created note for: ${fileName}`);
        } catch (error) {
            console.error(`Error processing file ${fileName}:`, error);
            new Notice(`Error processing ${fileName}: ${error.message}`);
        }
    }

    createNoteContent(fileName: string, noteTitle: string): string {
        // Replace placeholders in template
        let content = this.settings.templateContent
            .replace(/\{filename\}/g, fileName)
            .replace(/\{title\}/g, noteTitle)
            .replace(/\{date\}/g, new Date().toISOString().split('T')[0]);

        // Add file link
        content += `\n\n![[attachments/${fileName}]]`;
        
        return content;
    }

    async ensureFolderExists(folderPath: string): Promise<void> {
        const folderExists = await this.app.vault.adapter.exists(folderPath);
        
        if (!folderExists) {
            await this.app.vault.createFolder(folderPath);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, {
            targetFolder: 'FileScannerNotes',
            templateContent: '# {title}\n\nImported file: {filename}\nDate: {date}',
            fileExtensions: 'jpg,jpeg,png,pdf,docx,xlsx'
        }, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class FileScannerSettingTab extends PluginSettingTab {
    plugin: FileScanner;

    constructor(app: App, plugin: FileScanner) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'File Scanner Settings' });

        new Setting(containerEl)
            .setName('Target Folder')
            .setDesc('Where to store the created notes and attachments')
            .addText(text => text
                .setPlaceholder('Enter folder path')
                .setValue(this.plugin.settings.targetFolder)
                .onChange(async (value) => {
                    this.plugin.settings.targetFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Note Template')
            .setDesc('Template for the created notes. Use {title}, {filename}, and {date} as placeholders.')
            .addTextArea(text => text
                .setPlaceholder('# {title}\n\nImported file: {filename}\nDate: {date}')
                .setValue(this.plugin.settings.templateContent)
                .onChange(async (value) => {
                    this.plugin.settings.templateContent = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('File Extensions')
            .setDesc('Comma-separated list of file extensions to process (e.g., jpg,pdf,docx). Leave empty to process all files.')
            .addText(text => text
                .setPlaceholder('jpg,jpeg,png,pdf,docx,xlsx')
                .setValue(this.plugin.settings.fileExtensions)
                .onChange(async (value) => {
                    this.plugin.settings.fileExtensions = value;
                    await this.plugin.saveSettings();
                }));
    }
}
