// decision-same-named-entities PR 1, declaration form: INTERFACE.
//
// Two modules each declare `export interface Config`. Before PR 1,
// `convertInterfaceToDTO` hit `Duplicate entity name` on the second and
// `convert()` returned `success: false`, discarding every other entity in
// the run. Now the second declaration is renamed to `Settings__Config`
// (`${sanitizedModuleBasename}__${declName}`) and the conversion completes.
//
// Neither declaration carries a `from` clause, so this is a genuine
// same-name collision, not the barrel/re-export shape `isReExport` gates on.
import { loadSettings } from './settings.ts';

export interface Config {
  endpoint: string;
}

export const buildConfig = (): Config => {
  loadSettings();
  return { endpoint: 'https://example.invalid' };
};
