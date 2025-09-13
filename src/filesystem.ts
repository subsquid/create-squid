import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * File and directory operation utilities
 */

/**
 * Recursively gets all files and directories in a directory
 */
export async function getAllItems(dir: string, baseDir: string = dir): Promise<{files: string[], dirs: string[]}> {
  const items = await fs.readdir(dir);
  const files: string[] = [];
  const dirs: string[] = [];
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.relative(baseDir, fullPath);
    
    if ((await fs.stat(fullPath)).isDirectory()) {
      dirs.push(relativePath);
      const subItems = await getAllItems(fullPath, baseDir);
      files.push(...subItems.files);
      dirs.push(...subItems.dirs);
    } else {
      files.push(relativePath);
    }
  }
  
  return { files, dirs };
}

/**
 * Removes files and directories that are not in the generated files set
 */
export async function cleanupExistingFiles(
  outputDir: string, 
  generatedFiles: Set<string>,
  preservedFiles: Set<string>,
  preservedDirs: Set<string>
): Promise<void> {
  console.log('Cleaning up existing generated files...');

  try {
    const { files: allFiles, dirs: allDirs } = await getAllItems(outputDir);
    
    // Remove files that are not preserved and not in generated files list
    for (const file of allFiles) {
      const filePath = path.join(outputDir, file);
      const relativePath = file;
      
      // Skip if it's a preserved file
      if (preservedFiles.has(relativePath)) {
        continue;
      }
      
      // Skip if it's in a preserved directory
      const isInPreservedDir = Array.from(preservedDirs).some(preservedDir => 
        relativePath.startsWith(preservedDir + path.sep)
      );
      if (isInPreservedDir) {
        continue;
      }
      
      // Skip if it will be generated
      if (generatedFiles.has(relativePath)) {
        continue;
      }
      
      // Remove the file
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
      }
    }
    
    // Remove empty directories that are not preserved
    for (const dir of allDirs) {
      const dirPath = path.join(outputDir, dir);
      
      // Skip if it's a preserved directory
      if (preservedDirs.has(dir)) {
        continue;
      }
      
      // Skip if this directory is generated or contains generated files
      const hasGeneratedFiles = Array.from(generatedFiles).some(generatedFile => 
        generatedFile.startsWith(dir + path.sep) || generatedFile === dir
      );
      if (hasGeneratedFiles) {
        continue;
      }
      
      // Remove the directory if it's empty
      if (await fs.pathExists(dirPath)) {
        try {
          const contents = await fs.readdir(dirPath);
          if (contents.length === 0) {
            await fs.remove(dirPath);
          }
        } catch (error) {
          // Directory might have been removed already or have permission issues
        }
      }
    }
  } catch (error) {
    console.warn('Warning: Could not scan directory for cleanup:', error);
  }
}
