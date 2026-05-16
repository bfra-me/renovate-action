import type {Options} from 'tsup'
import esbuildPluginLicense, {type Dependency} from 'esbuild-plugin-license'

export const tsup: Options = {
  banner: {js: "import {createRequire} from 'node:module';const require=createRequire(import.meta.url);"},
  dts: true,
  entry: {index: 'src/main.ts'},
  esbuildPlugins: [
    esbuildPluginLicense({
      thirdParty: {
        output: {
          file: 'licenses.txt',
          template: (dependencies: Dependency[]) =>
            dependencies
              .map(({licenseText, packageJson}) => `${packageJson.name}\n${packageJson.license}\n${licenseText}`)
              .join('\n\n'),
        },
      },
    }),
  ],
  format: ['esm'],
  ignoreWatch: ['**/dist', '**/node_modules'],
  minify: true,
  noExternal: ['@actions/core'],
  sourcemap: true,
}

export default tsup
