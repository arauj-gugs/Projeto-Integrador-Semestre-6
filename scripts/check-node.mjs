const major = Number(process.versions.node.split(".")[0]);
if (Number.isNaN(major) || major < 24) {
  console.error(
    `Este projeto exige Node.js 24+ (agora: ${process.version}).\n` +
      `No PowerShell: $env:Path = "C:\\nvm4w\\nodejs;" + $env:Path   # ou: nvm use 24`,
  );
  process.exit(1);
}
