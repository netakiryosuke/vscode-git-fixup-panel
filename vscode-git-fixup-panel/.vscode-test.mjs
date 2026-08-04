import { defineConfig } from '@vscode/test-cli';

const userDataDir = process.env.VSCODE_TEST_USER_DATA_DIR;
const testWorkspace = 'src/test/fixtures/configuration.code-workspace';

export default defineConfig({
	files: 'out/test/**/*.test.js',
	workspaceFolder: testWorkspace,
	launchArgs: userDataDir ? ['--user-data-dir', userDataDir] : [],
});
