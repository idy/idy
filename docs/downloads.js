export const downloads = {
  "GizClaw/gizclaw": [],
  "GizClaw/gizmoth": [
    {
      label: "downloadGizmothMacArm",
      pattern: /^GizMoth_.+_aarch64-apple-darwin\.dmg$/i,
    },
    {
      label: "downloadGizmothMacIntel",
      pattern: /^GizMoth_.+_x86_64-apple-darwin\.dmg$/i,
    },
    {
      label: "downloadGizmothWindows",
      pattern: /^GizMoth_.+_x86_64-pc-windows-msvc-setup\.exe$/i,
    },
  ],
  "GizClaw/gizos": [],
  "idy/yesman": [
    { label: "downloadYesmanMacArm", pattern: /^yesman-\d[^/]*-arm64\.dmg$/i },
    { label: "downloadYesmanMacIntel", pattern: /^yesman-\d[^/]*-amd64\.dmg$/i },
    { label: "downloadYesmanWindowsArm", pattern: /^yesman-setup-\d[^/]*-arm64\.exe$/i },
    { label: "downloadYesmanWindows", pattern: /^yesman-setup-\d[^/]*-amd64\.exe$/i },
    { label: "downloadYesmanLinuxArm", pattern: /^yesman-\d[^/]*-linux-arm64\.tar\.gz$/i },
    { label: "downloadYesmanLinux", pattern: /^yesman-\d[^/]*-linux-amd64\.tar\.gz$/i },
  ],
  "idy/nootify": [
    {
      label: "downloadNootify",
      pattern: /^Nootify_.+_(?:aarch64|arm64)\.dmg$/i,
    },
  ],
  "idy/ch348-macos": [
    { label: "downloadCH348", pattern: /^CH348-.*-macos-.*\.pkg$/i },
  ],
  "idy/tailsplit": [
    {
      label: "downloadTailSplitMac",
      pattern: /^TailSplit_.*_darwin_arm64\.dmg$/i,
    },
    {
      label: "downloadTailSplitWindows",
      pattern: /^TailSplit_.*_windows_amd64_setup\.exe$/i,
    },
  ],
  "idy/tailrelay": [
    {
      label: "downloadTailRelay",
      pattern: /^tailrelay_.*_linux_amd64\.tar\.gz$/i,
    },
  ],
  "idy/wgc": [{ label: "downloadWGC", source: true }],
  "idy/wgc-ne": [
    { label: "downloadWGCNE", pattern: /^WGCCore-.*\.xcframework\.zip$/i },
  ],
  "idy/sing-box-flutter": [
    {
      label: "downloadSingBoxAndroid",
      pattern: /^libbox-.+-android\.tar\.gz$/i,
    },
    { label: "downloadSingBoxApple", pattern: /^libbox-.+-apple\.tar\.gz$/i },
  ],
};
