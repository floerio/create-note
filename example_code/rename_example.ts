import { App, Notice, Plugin, TFile, TFolder } from 'obsidian';

/**
 * Example function demonstrating how to use app.vault.rename()
 * 
 * The app.vault.rename() function is used to rename files or folders in the Obsidian vault.
 * Syntax: app.vault.rename(file: TAbstractFile, newPath: string): Promise<void>
 * 
 * Parameters:
 * - file: The file or folder to rename (TFile or TFolder)
 * - newPath: The new path for the file or folder (including the new name)
 * 
 * Returns: A Promise that resolves when the rename operation is complete
 */
export async function renameExamples(app: App) {
    try {
        // Example 1: Rename a file
        // First, get a reference to the file you want to rename
        const fileToRename = app.vault.getFileByPath('path/to/original-file.md');
        
        if (fileToRename) {
            // Rename the file to a new name in the same folder
            await app.vault.rename(fileToRename, 'path/to/new-filename.md');
            new Notice('File renamed successfully!');
        }
        
        // Example 2: Move a file to a different folder (which is also a rename operation)
        const fileToMove = app.vault.getFileByPath('source/folder/document.md');
        
        if (fileToMove) {
            // Move the file to a different folder with the same name
            await app.vault.rename(fileToMove, 'destination/folder/document.md');
            new Notice('File moved successfully!');
        }
        
        // Example 3: Rename a folder
        const folderToRename = app.vault.getAbstractFileByPath('old-folder-name') as TFolder;
        
        if (folderToRename && folderToRename instanceof TFolder) {
            // Rename the folder
            await app.vault.rename(folderToRename, 'new-folder-name');
            new Notice('Folder renamed successfully!');
        }
        
        // Example 4: Rename a file and handle errors properly
        try {
            const file = app.vault.getFileByPath('notes/draft.md');
            if (!file) {
                throw new Error('File not found');
            }
            
            // Check if destination already exists
            const newPath = 'notes/published.md';
            const exists = await app.vault.adapter.exists(newPath);
            
            if (exists) {
                throw new Error('Destination file already exists');
            }
            
            await app.vault.rename(file, newPath);
            new Notice('File renamed from draft to published!');
        } catch (error) {
            new Notice(`Error renaming file: ${error.message}`);
            console.error('Error during rename operation:', error);
        }
        
        // Example 5: Practical use case - Rename with timestamp
        const noteFile = app.vault.getFileByPath('Untitled.md') as TFile;
        if (noteFile) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const newName = `Notes-${timestamp}.md`;
            await app.vault.rename(noteFile, newName);
            new Notice(`Added timestamp to file: ${newName}`);
        }
        
    } catch (error) {
        console.error('Error in rename examples:', error);
        new Notice(`Error: ${error.message}`);
    }
}

/**
 * Example plugin command that renames the active file
 */
export function addRenameCommand(plugin: Plugin) {
    plugin.addCommand({
        id: 'rename-current-file',
        name: 'Rename current file with prefix',
        editorCallback: async (editor, view) => {
            if (!view.file) {
                new Notice('No file is currently open');
                return;
            }
            
            // Get the current file
            const currentFile = view.file;
            
            // Get the current path and extract components
            const currentPath = currentFile.path;
            const lastSlashIndex = currentPath.lastIndexOf('/');
            const directory = lastSlashIndex !== -1 ? currentPath.substring(0, lastSlashIndex + 1) : '';
            const fileName = lastSlashIndex !== -1 ? currentPath.substring(lastSlashIndex + 1) : currentPath;
            
            // Create new path with prefix
            const newPath = directory + 'important-' + fileName;
            
            try {
                // Perform the rename operation
                await plugin.app.vault.rename(currentFile, newPath);
                new Notice(`File renamed to: ${newPath}`);
            } catch (error) {
                new Notice(`Failed to rename file: ${error.message}`);
                console.error('Rename error:', error);
            }
        }
    });
}