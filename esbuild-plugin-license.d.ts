declare module 'esbuild-plugin-license' {
  export interface DependencyPackageJson {
    name: string
    license: string
  }

  export interface Dependency {
    licenseText: string
    packageJson: DependencyPackageJson
  }

  export interface ThirdPartyOutputOptions {
    file: string
    template: (dependencies: Dependency[]) => string
  }

  export interface ThirdPartyOptions {
    output: ThirdPartyOutputOptions
  }

  export interface EsbuildPluginLicenseOptions {
    thirdParty?: ThirdPartyOptions
  }

  export default function esbuildPluginLicense(options?: EsbuildPluginLicenseOptions): unknown
}
