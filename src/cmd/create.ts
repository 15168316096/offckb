import path from 'path';
import { currentExecPath, dappTemplateGitBranch, dappTemplateGitFolder, dappTemplateGitUrl } from '../cfg/const';
import { findFileInFolder, updateVersionInTSFile } from '../util/fs';
import { BareTemplateOption, loadBareTemplateOpts } from '../util/template';
import { gitCloneAndDownloadFolderSync } from '../util/git';
import { select } from '@inquirer/prompts';
import { execSync } from 'child_process';
const version = require('../../package.json').version;

export interface CreateOption {
  script: boolean;
}

export function createScriptProject(name: string) {
  const cmd = `cargo generate gh:cryptape/ckb-script-templates workspace --name ${name}`;
  try {
    execSync(cmd, { encoding: 'utf-8', stdio: 'inherit' });
  } catch (error: unknown) {
    console.error('create script project failed, ', (error as Error).message);
  }
}

export async function create(name: string, template: BareTemplateOption) {
  const targetPath = path.resolve(currentExecPath, name);
  const dappTemplateFolderPath = `${dappTemplateGitFolder}/${template.value}`;
  gitCloneAndDownloadFolderSync(dappTemplateGitUrl, dappTemplateGitBranch, dappTemplateFolderPath, targetPath);

  // update the version
  const projectFolder = path.resolve(currentExecPath, name);
  const targetConfigPath = findFileInFolder(projectFolder, 'offckb.config.ts');
  if (targetConfigPath) {
    updateVersionInTSFile(version, targetConfigPath);
  } else {
    console.log("Couldn't find the offckb config file in project. abort.");
  }
}

export async function selectBareTemplate() {
  const opts = await loadBareTemplateOpts();

  const answer = await select({
    message: 'Select a bare template',
    choices: opts.map((opt) => {
      return {
        name: opt.name,
        value: opt.value,
        description: `${opt.description}, \n[${opt.tag.toString()}]`,
      };
    }),
  });

  return opts.find((opt) => opt.value === answer)!;
}
