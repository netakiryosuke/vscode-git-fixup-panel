import { defineConfig } from '@vscode/test-cli';

const userDataDir = process.env.VSCODE_TEST_USER_DATA_DIR;

export default defineConfig({
	files: 'out/test/**/*.test.js',
	launchArgs: userDataDir ? ['--user-data-dir', userDataDir] : [],
});
