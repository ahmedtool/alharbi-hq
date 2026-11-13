// Sets the app icon and version details on the .exe without needing Wine
// (electron-builder's own step needs Wine when building on Linux/Mac).
const fs = require("fs");
const path = require("path");
const ResEdit = require("resedit");

exports.default = async function afterPack(ctx) {
  if (ctx.electronPlatformName !== "win32") return;
  const { productFilename } = ctx.packager.appInfo;
  const exeName = ctx.packager.platformSpecificBuildOptions.executableName || productFilename;
  const exePath = path.join(ctx.appOutDir, `${exeName}.exe`);
  const exe = ResEdit.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
  const res = ResEdit.NtExecutableResource.from(exe);

  const ico = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, "build", "icon.ico")));
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
    res.entries, 1, 1033, ico.icons.map((i) => i.data),
  );

  const version = ctx.packager.appInfo.version;
  const [vi] = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
  vi.setFileVersion(...version.split(".").map(Number), 0);
  vi.setProductVersion(...version.split(".").map(Number), 0);
  vi.setStringValues({ lang: 1033, codepage: 1200 }, {
    FileDescription: "Ahmed Alharbi",
    ProductName: "Ahmed Alharbi",
    CompanyName: "Ahmed Alharbi",
    LegalCopyright: `© ${new Date().getFullYear()} Ahmed Alharbi`,
    OriginalFilename: `${exeName}.exe`,
  });
  vi.outputToResourceEntries(res.entries);

  res.outputResource(exe);
  fs.writeFileSync(exePath, Buffer.from(exe.generate()));
};
