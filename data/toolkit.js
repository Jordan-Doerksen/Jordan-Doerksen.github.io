// MIRRORED from C:\projects\it-toolkit\data\tools.js — edit there, copy here.
/*
 * IT Toolkit — structured tool data (drives index.html)
 * ---------------------------------------------------------------------------
 * This file is the structured source of truth for the browsable web page.
 * The human-readable version lives in /categories/*.md (what GitHub renders).
 * To ADD a tool: add an entry here AND a row in the matching categories/*.md.
 * license: one of  OSS | Free | Free (personal) | Free (tier) | Free (built-in)
 * medium:  true when it needs a bit more setup/know-how than the basics.
 */
window.IT_TOOLKIT = {
  categories: [
    { id: "01", title: "Remote Access & Support",   blurb: "Get onto another machine to fix it" },
    { id: "02", title: "Networking & Diagnostics",  blurb: "Scan, sniff, ping, trace, connect" },
    { id: "15", title: "Mapping & Discovery",       blurb: "Map the network or the machine you're fixing" },
    { id: "03", title: "System Info & Hardware",    blurb: "What's inside the box, is it healthy" },
    { id: "04", title: "Sysinternals (Windows)",    blurb: "Microsoft's own Windows power-tools" },
    { id: "05", title: "Disk, Imaging & Backup",    blurb: "Bootable USBs, clones, images, backups" },
    { id: "06", title: "Data Recovery",             blurb: "Get deleted / lost files back" },
    { id: "07", title: "Security & Malware Removal",blurb: "Find and remove nasties" },
    { id: "08", title: "Passwords & Secrets",       blurb: "Store and share credentials safely" },
    { id: "09", title: "File Transfer & Sync",      blurb: "Move and mirror files reliably" },
    { id: "10", title: "Everyday Utilities",        blurb: "The little tools on every machine" },
    { id: "11", title: "Documentation & Ticketing", blurb: "Notes, diagrams, tickets, assets" },
    { id: "12", title: "Monitoring",                blurb: "Know when something's down first" },
    { id: "13", title: "Virtualization & Labs",     blurb: "Spin up test machines" },
    { id: "14", title: "Editors & Terminals",       blurb: "Where you actually do the work" }
  ],

  tools: [
    // 01 — Remote Access & Support
    { cat: "01", name: "RustDesk", url: "https://rustdesk.com/", desc: "Open-source TeamViewer alternative; self-host the relay or use theirs. The current go-to free remote-support tool.", platform: "Win / macOS / Linux / mobile", license: "OSS" },
    { cat: "01", name: "TightVNC", url: "https://www.tightvnc.com/", desc: "Lightweight VNC for LAN remote control, no account.", platform: "Win / Linux", license: "OSS" },
    { cat: "01", name: "TigerVNC", url: "https://tigervnc.org/", desc: "Faster, actively-maintained cross-platform VNC.", platform: "Win / macOS / Linux", license: "OSS" },
    { cat: "01", name: "Chrome Remote Desktop", url: "https://remotedesktop.google.com/", desc: "Zero-config remote access through a Google account and browser. Dead simple for helping family/small clients.", platform: "Any (browser)", license: "Free" },
    { cat: "01", name: "AnyDesk", url: "https://anydesk.com/", desc: "Fast, polished remote support.", platform: "Win / macOS / Linux / mobile", license: "Free (personal)", caveat: "Free for personal use only — business needs a license." },
    { cat: "01", name: "TeamViewer", url: "https://www.teamviewer.com/", desc: "The old standard for remote support.", platform: "Win / macOS / Linux / mobile", license: "Free (personal)", caveat: "Free for personal use only; commercial use gets flagged." },
    { cat: "01", name: "MeshCentral", url: "https://meshcentral.com/", desc: "Self-hosted web-based remote management for a whole fleet of machines.", platform: "Web / self-host", license: "OSS", medium: true },
    { cat: "01", name: "Tactical RMM", url: "https://tacticalrmm.com/", desc: "Self-hosted remote monitoring & management (agent + web console) without the subscription.", platform: "Web / self-host", license: "OSS", medium: true },

    // 02 — Networking & Diagnostics
    { cat: "02", name: "Advanced IP Scanner", url: "https://www.advanced-ip-scanner.com/", desc: "One-click LAN scan: IPs, hostnames, MACs, open shares. The fastest 'what's on this network' tool.", platform: "Win", license: "Free" },
    { cat: "02", name: "Angry IP Scanner", url: "https://angryip.org/", desc: "Cross-platform, lightweight, portable IP/port scanner.", platform: "Win / macOS / Linux", license: "OSS" },
    { cat: "02", name: "Nmap (+ Zenmap)", url: "https://nmap.org/", desc: "The network scanner: host discovery, port scanning, service/OS detection.", platform: "Win / macOS / Linux", license: "OSS", medium: true },
    { cat: "02", name: "Wireshark", url: "https://www.wireshark.org/", desc: "Packet capture and deep analysis — when you truly need to see what's on the wire.", platform: "Win / macOS / Linux", license: "OSS", medium: true },
    { cat: "02", name: "PuTTY", url: "https://www.putty.org/", desc: "The classic SSH / Telnet / serial client for Windows. Tiny, portable, essential.", platform: "Win", license: "OSS" },
    { cat: "02", name: "MobaXterm", url: "https://mobaxterm.mobatek.net/", desc: "SSH client + tabbed terminal + X server + SFTP in one window. Free Home Edition.", platform: "Win", license: "Free" },
    { cat: "02", name: "WinMTR / mtr", url: "https://sourceforge.net/projects/winmtr/", desc: "Ping + traceroute in one live table — best tool for pinpointing where a route goes bad.", platform: "Win / Linux / macOS", license: "OSS" },
    { cat: "02", name: "iperf3", url: "https://iperf.fr/", desc: "Measure real throughput between two machines. Settle 'is it the network or the app.'", platform: "Win / macOS / Linux", license: "OSS" },
    { cat: "02", name: "NetworkMiner", url: "https://www.netresec.com/?page=NetworkMiner", desc: "Passive network forensics — pulls files, hosts, credentials from a capture. Free edition.", platform: "Win / Linux", license: "Free", medium: true },
    { cat: "02", name: "Fing", url: "https://www.fing.com/", desc: "Phone-app network scanner for a quick device inventory from your pocket.", platform: "mobile", license: "Free" },
    { cat: "02", name: "TCPView", url: "https://learn.microsoft.com/sysinternals/downloads/tcpview", desc: "Live list of every connection a Windows box has open, and which process owns it.", platform: "Win", license: "Free" },
    // 02 — Networking: DNS / capture / latency / ports / bandwidth
    { cat: "02", name: "dig (BIND DNS tools)", url: "https://www.isc.org/dns-tools/", desc: "Command-line DNS lookups — records, +trace delegation, and resolver-vs-authoritative mismatches. The DNS-troubleshooting standard.", platform: "Win / macOS / Linux", license: "OSS" },
    { cat: "02", name: "doggo", url: "https://github.com/mr-karan/doggo", desc: "A friendlier modern 'dig' — color/tabular or JSON output, DoH/DoT/DoQ. Single binary.", platform: "Win / macOS / Linux", license: "OSS" },
    { cat: "02", name: "tcpdump", url: "https://www.tcpdump.org/", desc: "Command-line packet capture with BPF filters — grab a .pcap on a headless box or over SSH, then open it in Wireshark.", platform: "Linux / macOS / BSD (Win via WinDump)", license: "OSS", medium: true, caveat: "Needs root/sudo to capture." },
    { cat: "02", name: "PingPlotter Free", url: "https://www.pingplotter.com/products/free/", desc: "Visual traceroute that continuously graphs latency and packet loss per hop — pinpoint which hop is dropping or spiking.", platform: "Win / macOS / Linux", license: "Free (tier)", caveat: "Free tier tracks one target at a time." },
    { cat: "02", name: "PingInfoView", url: "https://www.nirsoft.net/utils/multiple_ping_tool.html", desc: "Continuously pings a batch of hosts (ICMP or TCP) and tabulates response time, success/fail and loss in one window.", platform: "Win", license: "Free", caveat: "AV may false-flag NirSoft tools." },
    { cat: "02", name: "SmokePing", url: "https://oss.oetiker.ch/smokeping/", desc: "Self-hosted latency/loss grapher — pings targets on a schedule and renders 'smoke' graphs to spot jitter and flaky links over time.", platform: "Linux / Docker", license: "OSS", medium: true },
    { cat: "02", name: "CurrPorts", url: "https://www.nirsoft.net/utils/cports.html", desc: "Lists every open TCP/UDP port mapped to its owning process; right-click to kill it. Flags unsigned listeners in pink.", platform: "Win", license: "Free", caveat: "AV may false-flag NirSoft tools." },
    { cat: "02", name: "LibreSpeed", url: "https://librespeed.org/", desc: "Free/OSS HTML5 speed test — in-browser or self-hosted; measures down/up throughput, ping and jitter with no telemetry.", platform: "Web / self-host", license: "OSS", medium: true },
    { cat: "02", name: "arp-scan", url: "https://github.com/royhills/arp-scan", desc: "Sweep the local subnet with ARP to find live hosts + their MAC/vendor — catches devices that block ping/ICMP.", platform: "Linux / macOS / BSD", license: "OSS", medium: true, caveat: "CLI; needs root and same-subnet access." },
    { cat: "02", name: "bandwhich", url: "https://github.com/imsnif/bandwhich", desc: "Terminal tool showing live bandwidth by process, connection and remote host — spot what's saturating a link.", platform: "Win / macOS / Linux", license: "OSS", medium: true, caveat: "Needs root/admin to capture." },
    { cat: "02", name: "NetSetMan", url: "https://www.netsetman.com/en/freeware", desc: "One-click switch between saved network profiles (IP, subnet, gateway, DNS, PC name, printer) for hopping between sites.", platform: "Win", license: "Free (personal)", caveat: "Free edition is non-commercial only; work machines need Pro." },
    // 02 — Networking: Wi-Fi diagnostics
    { cat: "02", name: "WifiInfoView", url: "https://www.nirsoft.net/utils/wifi_information_view.html", desc: "Portable scanner tabling every nearby AP — SSID, BSSID, channel, RSSI, PHY, speed, vendor. Fast channel/signal triage, no install.", platform: "Win", license: "Free", caveat: "AV may false-flag NirSoft tools." },
    { cat: "02", name: "WiFi Analyzer", url: "https://apps.microsoft.com/detail/9nblggh33n0n", desc: "Store app that plots nearby APs on live 2.4/5 GHz channel graphs with a signal meter — find the clearest channel, place the router.", platform: "Win", license: "Free (tier)" },
    { cat: "02", name: "NetSpot", url: "https://www.netspotapp.com/", desc: "WiFi analyzer + site survey — walk a floor plan to build a coverage heatmap that pinpoints dead zones.", platform: "Win / macOS / Android / iOS", license: "Free (tier)", medium: true, caveat: "Free heatmap survey is capped; scanning is unlimited." },
    { cat: "02", name: "Acrylic WiFi Home", url: "https://www.acrylicwifi.com/en/wifi-analyzer/", desc: "Windows scanner listing SSIDs with RSSI, channels, band, encryption, vendor + graphs to spot overlap. WiFi 7 / 6 GHz.", platform: "Win", license: "Free (personal)", caveat: "Personal/non-commercial use only; caps device inventory at 5." },
    { cat: "02", name: "WiFiman", url: "https://wifiman.com/", desc: "Ubiquiti's free ad-free phone analyzer — signal, throughput, latency, roaming, speed test, subnet scan, coverage heatmap.", platform: "iOS / Android / desktop", license: "Free" },
    { cat: "02", name: "WiFiAnalyzer (open-source)", url: "https://github.com/VREMSoftwareDevelopment/WiFiAnalyzer", desc: "Free Android app graphing signal by channel across 2.4/5/6 GHz, rating channels and estimating AP distance.", platform: "Android", license: "OSS", caveat: "Get it from Play/F-Droid, not an unofficial clone." },
    { cat: "02", name: "inSSIDer", url: "https://www.oscium.com/inssider/", desc: "Lists nearby APs with channel, width, signal, WiFi generation, rate and security to spot overlap and misconfigured APs.", platform: "Win / macOS", license: "Free (tier)", caveat: "Requires a free Oscium account." },
    { cat: "02", name: "WirelessNetView", url: "https://www.nirsoft.net/utils/wireless_network_view.html", desc: "Tiny background monitor logging nearby networks over time — signal, channel, auth, MAC, detection frequency. Spots rogue APs.", platform: "Win", license: "Free", caveat: "AV may false-flag NirSoft tools." },
    { cat: "02", name: "Vistumbler", url: "https://www.vistumbler.net/", desc: "Open-source scanner that logs APs via the Native WiFi API and, with a GPS receiver, maps coverage for export to Google Earth.", platform: "Win", license: "OSS", medium: true },

    // 03 — System Info & Hardware
    { cat: "03", name: "HWiNFO", url: "https://www.hwinfo.com/", desc: "The most thorough free hardware info + live sensors tool. Temps, voltages, fans, every component.", platform: "Win", license: "Free" },
    { cat: "03", name: "CPU-Z", url: "https://www.cpuid.com/softwares/cpu-z.html", desc: "Exact CPU, motherboard, RAM and chipset details.", platform: "Win", license: "Free" },
    { cat: "03", name: "GPU-Z", url: "https://www.techpowerup.com/gpuz/", desc: "Graphics card model, clocks, temps and sensors.", platform: "Win", license: "Free" },
    { cat: "03", name: "CrystalDiskInfo", url: "https://crystalmark.info/en/software/crystaldiskinfo/", desc: "Drive health via S.M.A.R.T. — warns you a disk is failing before it does.", platform: "Win", license: "OSS" },
    { cat: "03", name: "CrystalDiskMark", url: "https://crystalmark.info/en/software/crystaldiskmark/", desc: "Quick disk speed benchmark. 'Is this drive actually slow?'", platform: "Win", license: "OSS" },
    { cat: "03", name: "HWMonitor", url: "https://www.cpuid.com/softwares/hwmonitor.html", desc: "Simple temperature/voltage/fan monitor when you don't need HWiNFO's depth.", platform: "Win", license: "Free" },
    { cat: "03", name: "Speccy", url: "https://www.ccleaner.com/speccy", desc: "Clean, friendly full-system spec summary. Nice for reports/handoffs.", platform: "Win", license: "Free" },
    { cat: "03", name: "LibreHardwareMonitor", url: "https://github.com/LibreHardwareMonitor/LibreHardwareMonitor", desc: "Open-source temp/fan/voltage monitoring (the maintained Open Hardware Monitor fork).", platform: "Win", license: "OSS" },
    { cat: "03", name: "MemTest86", url: "https://www.memtest86.com/", desc: "Bootable RAM tester. When a machine crashes randomly, prove or clear the memory.", platform: "Bootable USB", license: "Free" },

    // 04 — Sysinternals
    { cat: "04", name: "Sysinternals Suite", url: "https://learn.microsoft.com/sysinternals/downloads/sysinternals-suite", desc: "Grab the whole toolkit at once and keep it on your USB stick.", platform: "Win", license: "Free" },
    { cat: "04", name: "Process Explorer", url: "https://learn.microsoft.com/sysinternals/downloads/process-explorer", desc: "Task Manager on steroids — find which handle locks a file, verify signatures, check a process on VirusTotal.", platform: "Win", license: "Free" },
    { cat: "04", name: "Autoruns", url: "https://learn.microsoft.com/sysinternals/downloads/autoruns", desc: "Every single thing that starts with Windows. The #1 malware-hunting and slow-boot tool.", platform: "Win", license: "Free" },
    { cat: "04", name: "Process Monitor (ProcMon)", url: "https://learn.microsoft.com/sysinternals/downloads/procmon", desc: "Live log of every file, registry and process operation. 'Why does this app fail?' → filter ProcMon.", platform: "Win", license: "Free", medium: true },
    { cat: "04", name: "PsExec", url: "https://learn.microsoft.com/sysinternals/downloads/psexec", desc: "Run commands on a remote Windows machine from the command line.", platform: "Win", license: "Free", medium: true, caveat: "AV often flags it — that's expected." },
    { cat: "04", name: "BgInfo", url: "https://learn.microsoft.com/sysinternals/downloads/bginfo", desc: "Paints machine name, IP and specs onto the desktop wallpaper. Great for labs and jump boxes.", platform: "Win", license: "Free" },
    { cat: "04", name: "Disk2vhd", url: "https://learn.microsoft.com/sysinternals/downloads/disk2vhd", desc: "Turn a live physical machine into a VHD you can boot in a VM. Quick P2V.", platform: "Win", license: "Free" },
    { cat: "04", name: "RAMMap / VMMap", url: "https://learn.microsoft.com/sysinternals/downloads/rammap", desc: "See exactly how memory is being used, for chasing leaks and pressure.", platform: "Win", license: "Free" },
    { cat: "04", name: "SDelete", url: "https://learn.microsoft.com/sysinternals/downloads/sdelete", desc: "Securely wipe files or free space.", platform: "Win", license: "Free" },

    // 05 — Disk, Imaging & Backup
    { cat: "05", name: "Ventoy", url: "https://www.ventoy.net/", desc: "Put many ISOs on one USB stick and pick at boot — no re-flashing. You never go back.", platform: "Win / Linux", license: "OSS" },
    { cat: "05", name: "Rufus", url: "https://rufus.ie/", desc: "Make a bootable USB from an ISO, fast. The single-ISO standard.", platform: "Win", license: "OSS" },
    { cat: "05", name: "balenaEtcher", url: "https://etcher.balena.io/", desc: "Dead-simple cross-platform USB/SD flasher.", platform: "Win / macOS / Linux", license: "OSS" },
    { cat: "05", name: "Clonezilla", url: "https://clonezilla.org/", desc: "Bootable disk/partition cloning and imaging. The free workhorse.", platform: "Bootable", license: "OSS", medium: true },
    { cat: "05", name: "Veeam Agent Free", url: "https://www.veeam.com/windows-endpoint-server-backup-free.html", desc: "Free full-image backup + bare-metal restore for a single machine.", platform: "Win / Linux", license: "Free" },
    { cat: "05", name: "Duplicati", url: "https://www.duplicati.com/", desc: "Encrypted, scheduled, incremental backups to cloud or network storage.", platform: "Win / macOS / Linux", license: "OSS" },
    { cat: "05", name: "WizTree", url: "https://diskanalyzer.com/", desc: "The fastest 'what's eating my disk space' map (reads the MFT).", platform: "Win", license: "Free" },
    { cat: "05", name: "WinDirStat", url: "https://windirstat.net/", desc: "Visual disk-usage treemap.", platform: "Win", license: "OSS" },
    { cat: "05", name: "TreeSize Free", url: "https://www.jam-software.com/treesize_free", desc: "Folder-size explorer for finding space hogs.", platform: "Win", license: "Free" },
    { cat: "05", name: "GParted", url: "https://gparted.org/", desc: "Bootable partition editor — resize, move, create, fix partitions.", platform: "Bootable / Linux", license: "OSS" },

    // 06 — Data Recovery
    { cat: "06", name: "Recuva", url: "https://www.ccleaner.com/recuva", desc: "Friendly undelete for accidentally-deleted files. First thing to try.", platform: "Win", license: "Free" },
    { cat: "06", name: "TestDisk", url: "https://www.cgsecurity.org/wiki/TestDisk", desc: "Recover lost/deleted partitions and fix boot sectors.", platform: "Win / macOS / Linux", license: "OSS", medium: true },
    { cat: "06", name: "PhotoRec", url: "https://www.cgsecurity.org/wiki/PhotoRec", desc: "Carves files by signature even when the filesystem is trashed.", platform: "Win / macOS / Linux", license: "OSS" },
    { cat: "06", name: "ddrescue", url: "https://www.gnu.org/software/ddrescue/", desc: "Image a failing drive intelligently, then recover from the copy. Do this first on a dying disk.", platform: "Linux / macOS", license: "OSS", medium: true },
    { cat: "06", name: "Disk Drill (Free)", url: "https://www.cleverfiles.com/", desc: "Polished GUI recovery; free tier recovers up to a size cap.", platform: "Win / macOS", license: "Free (tier)" },

    // 07 — Security & Malware Removal
    { cat: "07", name: "Malwarebytes Free", url: "https://www.malwarebytes.com/", desc: "The standard on-demand malware scanner/remover (manual scans on the free tier).", platform: "Win / macOS", license: "Free" },
    { cat: "07", name: "AdwCleaner", url: "https://www.malwarebytes.com/adwcleaner", desc: "Rips out adware, PUPs, toolbars and browser hijacks. Fast, one-shot.", platform: "Win", license: "Free" },
    { cat: "07", name: "Microsoft Defender Offline", url: "https://www.microsoft.com/wdsi/products/scanner", desc: "Built into Windows; the offline scan boots before Windows to catch things that hide.", platform: "Win", license: "Free" },
    { cat: "07", name: "ClamAV", url: "https://www.clamav.net/", desc: "Open-source AV engine — great for scanning file servers and Linux boxes on a schedule.", platform: "Win / macOS / Linux", license: "OSS", medium: true },
    { cat: "07", name: "ESET Online Scanner", url: "https://www.eset.com/int/home/online-scanner/", desc: "Second-opinion on-demand scanner for when one engine misses something.", platform: "Win", license: "Free" },
    { cat: "07", name: "Have I Been Pwned", url: "https://haveibeenpwned.com/", desc: "Check whether an email/password showed up in a breach. A habit, not an install.", platform: "Web", license: "Free" },
    { cat: "07", name: "OpenVAS / Greenbone", url: "https://www.openvas.org/", desc: "Free vulnerability scanner for finding missing patches and weak config across a network.", platform: "Linux / self-host", license: "OSS", medium: true },

    // 08 — Passwords & Secrets
    { cat: "08", name: "Bitwarden", url: "https://bitwarden.com/", desc: "The default recommendation. Cloud or self-hosted, generous free tier, great apps + extensions.", platform: "Win / macOS / Linux / mobile / web", license: "OSS" },
    { cat: "08", name: "KeePassXC", url: "https://keepassxc.org/", desc: "Offline, local .kdbx vault — no cloud, no account, total control.", platform: "Win / macOS / Linux", license: "OSS" },
    { cat: "08", name: "Vaultwarden", url: "https://github.com/dani-garcia/vaultwarden", desc: "Lightweight self-hosted server compatible with all the Bitwarden apps.", platform: "Self-host", license: "OSS", medium: true },
    { cat: "08", name: "KeePass", url: "https://keepass.info/", desc: "The original Windows KeePass with a huge plugin ecosystem.", platform: "Win", license: "OSS" },
    { cat: "08", name: "Proton Pass", url: "https://proton.me/pass", desc: "Free password manager with a clean UX and email aliases.", platform: "Win / macOS / Linux / mobile / web", license: "Free" },
    { cat: "08", name: "Passbolt", url: "https://www.passbolt.com/", desc: "Self-hosted team password manager built for sharing admin creds with permissions.", platform: "Self-host / web", license: "OSS", medium: true },

    // 09 — File Transfer & Sync
    { cat: "09", name: "WinSCP", url: "https://winscp.net/", desc: "SFTP / SCP / FTP client with a dual-pane Explorer feel. The default for getting files onto a Linux box.", platform: "Win", license: "OSS" },
    { cat: "09", name: "FileZilla", url: "https://filezilla-project.org/", desc: "Cross-platform FTP / FTPS / SFTP client (skip the bundled offers in the installer).", platform: "Win / macOS / Linux", license: "OSS" },
    { cat: "09", name: "FreeFileSync", url: "https://freefilesync.org/", desc: "Folder comparison + sync with real-time or scheduled jobs. Excellent for mirroring.", platform: "Win / macOS / Linux", license: "OSS" },
    { cat: "09", name: "Syncthing", url: "https://syncthing.net/", desc: "Continuous peer-to-peer folder sync between your own machines — no cloud, encrypted.", platform: "Win / macOS / Linux", license: "OSS" },
    { cat: "09", name: "rclone", url: "https://rclone.org/", desc: "'rsync for cloud storage' — sync/copy to 70+ backends (S3, B2, Drive, OneDrive…).", platform: "Win / macOS / Linux", license: "OSS", medium: true },
    { cat: "09", name: "rsync", url: "https://rsync.samba.org/", desc: "The classic efficient delta file-sync/copy on Linux/macOS (and via WSL).", platform: "Linux / macOS / WSL", license: "OSS" },
    { cat: "09", name: "TeraCopy", url: "https://www.codesector.com/teracopy", desc: "Faster, more reliable large file copies on Windows with verify + error handling.", platform: "Win", license: "Free" },
    { cat: "09", name: "PairDrop", url: "https://pairdrop.net/", desc: "Browser-based 'AirDrop for everything' — send files device-to-device over the LAN, no install.", platform: "Web", license: "OSS" },

    // 10 — Everyday Utilities
    { cat: "10", name: "7-Zip", url: "https://www.7-zip.org/", desc: "The archive tool. Opens/creates zip, 7z, rar, tar, iso and everything else.", platform: "Win", license: "OSS" },
    { cat: "10", name: "Everything", url: "https://www.voidtools.com/", desc: "Instant filename search across your whole drive — results as you type.", platform: "Win", license: "Free" },
    { cat: "10", name: "Microsoft PowerToys", url: "https://learn.microsoft.com/windows/powertoys/", desc: "A whole pack: FancyZones, PowerRename, a Spotlight-style launcher, color picker, always-on-top.", platform: "Win", license: "OSS" },
    { cat: "10", name: "ShareX", url: "https://getsharex.com/", desc: "Screenshot + annotate + screen record + GIFs + auto-upload. The power option.", platform: "Win", license: "OSS" },
    { cat: "10", name: "Greenshot", url: "https://getgreenshot.org/", desc: "Lightweight screenshot + annotate when you don't need ShareX's depth.", platform: "Win", license: "OSS" },
    { cat: "10", name: "Bulk Rename Utility", url: "https://www.bulkrenameutility.co.uk/", desc: "Rename hundreds of files with rules.", platform: "Win", license: "Free" },
    { cat: "10", name: "Ninite", url: "https://ninite.com/", desc: "Tick a bunch of apps, get one installer that installs/updates them all silently — no toolbars.", platform: "Win", license: "Free" },
    { cat: "10", name: "Chocolatey", url: "https://chocolatey.org/", desc: "Command-line package manager for Windows — install/update software with one command.", platform: "Win", license: "OSS", medium: true },
    { cat: "10", name: "winget", url: "https://learn.microsoft.com/windows/package-manager/", desc: "Built-in Windows package manager (install/update via CLI). Ships with Windows now.", platform: "Win", license: "Free (built-in)" },
    { cat: "10", name: "QuickLook", url: "https://github.com/QL-Win/QuickLook", desc: "Hit spacebar to preview any file, macOS-style.", platform: "Win", license: "OSS" },
    { cat: "10", name: "ZoomIt", url: "https://learn.microsoft.com/sysinternals/downloads/zoomit", desc: "Screen zoom + annotation for demos and showing a client something.", platform: "Win", license: "Free" },

    // 11 — Documentation & Ticketing
    { cat: "11", name: "draw.io / diagrams.net", url: "https://www.drawio.com/", desc: "Free diagramming for network maps, rack layouts, flowcharts. In-browser or desktop; files are plain XML.", platform: "Web / Win / macOS / Linux", license: "OSS" },
    { cat: "11", name: "Joplin", url: "https://joplinapp.org/", desc: "Open-source note-taking with Markdown, sync and encryption. Great tech knowledge base.", platform: "Win / macOS / Linux / mobile", license: "OSS" },
    { cat: "11", name: "Obsidian", url: "https://obsidian.md/", desc: "Markdown notes on local files with powerful linking. Popular for runbooks/KBs.", platform: "Win / macOS / Linux / mobile", license: "Free (personal)" },
    { cat: "11", name: "BookStack", url: "https://www.bookstackapp.com/", desc: "Self-hosted wiki organized as books/chapters/pages. Ideal shared IT documentation.", platform: "Self-host / web", license: "OSS", medium: true },
    { cat: "11", name: "osTicket", url: "https://osticket.com/", desc: "Classic self-hosted help-desk / ticketing system. Free and proven.", platform: "Self-host / web", license: "OSS", medium: true },
    { cat: "11", name: "GLPI", url: "https://glpi-project.org/", desc: "Self-hosted ITSM: tickets plus full asset inventory (with the GLPI agent).", platform: "Self-host / web", license: "OSS", medium: true },
    { cat: "11", name: "Snipe-IT", url: "https://snipeitapp.com/", desc: "Purpose-built IT asset management — track laptops, licenses, who has what, warranties.", platform: "Self-host / web", license: "OSS", medium: true },
    { cat: "11", name: "NetBox", url: "https://netboxlabs.com/community/", desc: "Source-of-truth for network/infrastructure — IPs, VLANs, racks, cabling.", platform: "Self-host / web", license: "OSS", medium: true },
    { cat: "11", name: "IT-Tools", url: "https://it-tools.tech/", desc: "One web page of handy converters/generators — hashes, base64, subnet calc, UUIDs, cron, JWT.", platform: "Web / self-host", license: "OSS" },

    // 12 — Monitoring
    { cat: "12", name: "Uptime Kuma", url: "https://github.com/louislam/uptime-kuma", desc: "The easy win — self-hosted uptime/status monitor with a lovely UI and alerts. Start here.", platform: "Self-host / web", license: "OSS" },
    { cat: "12", name: "Zabbix", url: "https://www.zabbix.com/", desc: "Full-featured enterprise-grade monitoring for servers, network gear and services — free and open source.", platform: "Self-host / Linux", license: "OSS", medium: true },
    { cat: "12", name: "LibreNMS", url: "https://www.librenms.org/", desc: "Auto-discovering SNMP network monitoring — switches, routers, servers, with graphs and alerts.", platform: "Self-host / Linux", license: "OSS", medium: true },
    { cat: "12", name: "Prometheus", url: "https://prometheus.io/", desc: "The modern metrics scraper — pairs with Grafana for dashboards.", platform: "Self-host", license: "OSS", medium: true },
    { cat: "12", name: "Grafana", url: "https://grafana.com/oss/grafana/", desc: "The go-to for pretty dashboards on almost any data source.", platform: "Self-host", license: "OSS", medium: true },
    { cat: "12", name: "Netdata", url: "https://www.netdata.cloud/", desc: "Drop it on a box and instantly get thousands of real-time metrics with zero config.", platform: "Win / Linux / macOS", license: "OSS" },
    { cat: "12", name: "Nagios Core", url: "https://www.nagios.org/projects/nagios-core/", desc: "The old-guard monitoring engine. Still widely deployed; steeper to configure.", platform: "Self-host / Linux", license: "OSS", medium: true },
    { cat: "12", name: "Glances", url: "https://nicolargo.github.io/glances/", desc: "A single-command, cross-platform 'top on steroids' in a terminal or browser.", platform: "Win / macOS / Linux", license: "OSS" },
    { cat: "12", name: "Healthchecks", url: "https://healthchecks.io/", desc: "Dead-man's-switch monitoring — pings you when a cron job or backup doesn't run.", platform: "Web / self-host", license: "OSS" },

    // 13 — Virtualization & Labs
    { cat: "13", name: "VirtualBox", url: "https://www.virtualbox.org/", desc: "The free desktop hypervisor. Run Windows/Linux VMs for testing. The default first lab.", platform: "Win / macOS / Linux", license: "OSS" },
    { cat: "13", name: "VMware Workstation", url: "https://www.vmware.com/products/desktop-hypervisor.html", desc: "Now free for personal use (Player and Pro). Snappier than VirtualBox for some workloads.", platform: "Win / Linux", license: "Free (personal)" },
    { cat: "13", name: "Proxmox VE", url: "https://www.proxmox.com/en/proxmox-virtual-environment/overview", desc: "Free open-source server virtualization (KVM VMs + LXC containers) with a web UI. Homelab favorite.", platform: "Self-host / Linux", license: "OSS", medium: true },
    { cat: "13", name: "Hyper-V", url: "https://learn.microsoft.com/virtualization/hyper-v-on-windows/", desc: "Built into Windows Pro/Enterprise — enable a feature, no download.", platform: "Win", license: "Free (built-in)" },
    { cat: "13", name: "Windows Sandbox", url: "https://learn.microsoft.com/windows/security/application-security/application-isolation/windows-sandbox/", desc: "Throwaway clean Windows desktop in seconds to test a sketchy installer — wipes itself on close.", platform: "Win", license: "Free (built-in)" },
    { cat: "13", name: "QEMU", url: "https://www.qemu.org/", desc: "The open-source engine behind a lot of this. Powerful, scriptable, emulates other CPU architectures.", platform: "Win / macOS / Linux", license: "OSS", medium: true },
    { cat: "13", name: "Vagrant", url: "https://www.vagrantup.com/", desc: "Define a VM in a text file and 'vagrant up' — reproducible dev/test boxes.", platform: "Win / macOS / Linux", license: "Free", medium: true },
    { cat: "13", name: "Podman", url: "https://podman.io/", desc: "Containers — daemonless and fully open. Fast way to run one of the self-hosted tools here.", platform: "Win / macOS / Linux", license: "OSS", medium: true },
    { cat: "13", name: "Docker Desktop", url: "https://www.docker.com/products/docker-desktop/", desc: "Containers — the fastest way to spin up the self-hosted tools on this list.", platform: "Win / macOS / Linux", license: "Free (personal)", caveat: "Paid for larger businesses; engine/CLI is free." },

    // 14 — Editors & Terminals
    { cat: "14", name: "Notepad++", url: "https://notepad-plus-plus.org/", desc: "Fast, lightweight text/code editor with syntax highlighting, find-in-files and column edit.", platform: "Win", license: "OSS" },
    { cat: "14", name: "Visual Studio Code", url: "https://code.visualstudio.com/", desc: "The everything-editor: extensions, built-in Git, integrated terminal, SSH remote editing.", platform: "Win / macOS / Linux", license: "Free" },
    { cat: "14", name: "VSCodium", url: "https://vscodium.com/", desc: "Fully-open, telemetry-free build of VS Code.", platform: "Win / macOS / Linux", license: "OSS" },
    { cat: "14", name: "Windows Terminal", url: "https://learn.microsoft.com/windows/terminal/", desc: "Modern tabbed terminal for PowerShell, CMD and WSL in one window.", platform: "Win", license: "OSS" },
    { cat: "14", name: "PowerShell 7", url: "https://learn.microsoft.com/powershell/", desc: "Cross-platform, far more capable than the built-in 5.1. The scripting language for Windows admin.", platform: "Win / macOS / Linux", license: "OSS" },
    { cat: "14", name: "WSL", url: "https://learn.microsoft.com/windows/wsl/", desc: "Run a real Linux environment inside Windows — 'wsl --install' and you have Ubuntu tooling.", platform: "Win", license: "Free (built-in)" },
    { cat: "14", name: "Tabby", url: "https://tabby.sh/", desc: "Modern, cross-platform, highly configurable terminal.", platform: "Win / macOS / Linux", license: "OSS" },
    { cat: "14", name: "WezTerm", url: "https://wezterm.org/", desc: "GPU-accelerated, highly configurable cross-platform terminal.", platform: "Win / macOS / Linux", license: "OSS" },
    { cat: "14", name: "jq", url: "https://jqlang.github.io/jq/", desc: "Command-line JSON processor — slice API responses without a script.", platform: "Win / macOS / Linux", license: "OSS" },
    { cat: "14", name: "yq", url: "https://github.com/mikefarah/yq", desc: "Command-line YAML/JSON processor.", platform: "Win / macOS / Linux", license: "OSS" },

    // 15 — Mapping & Discovery :: map the NETWORK
    { cat: "15", name: "Spiceworks Inventory", url: "https://www.spiceworks.com/free-pc-network-inventory-software/", desc: "Free, ad-supported cloud tool that agentlessly scans the LAN (WMI/SNMP) to auto-discover and inventory every IP device.", platform: "Web (cloud)", license: "Free", medium: true, caveat: "Ad-supported; cloud-only inventory (discovery/asset-tracking more than topology)." },
    { cat: "15", name: "Lansweeper", url: "https://www.lansweeper.com/", desc: "Agentless scan that builds a live hardware + software asset inventory in one console.", platform: "Win server / web", license: "Free (tier)", medium: true, caveat: "Free tier caps at 100 assets." },
    { cat: "15", name: "PRTG Network Monitor", url: "https://www.paessler.com/prtg", desc: "Sensor-based monitor that auto-discovers devices across an IP range and builds live status maps.", platform: "Win server / web / mobile", license: "Free (tier)", medium: true, caveat: "Free tier = 100 sensors (~20 devices)." },
    { cat: "15", name: "Open-AudIT Community", url: "https://open-audit.com/", desc: "Agentless scan (SNMP + credentialed WMI/SSH) that auto-builds a full hardware/software asset inventory and flags unknown devices.", platform: "Win / Linux (self-host)", license: "OSS", medium: true },
    { cat: "15", name: "Netdisco", url: "https://netdisco.org/", desc: "Reads switch MAC/forwarding + router ARP tables over SNMP to tell you exactly which switch port any IP or MAC is plugged into.", platform: "Linux / Docker (web UI)", license: "OSS", medium: true, caveat: "Needs SNMP on switches + a PostgreSQL backend." },
    { cat: "15", name: "NetXMS", url: "https://netxms.com/", desc: "Auto-discovers and paints a live L2/L3 connectivity map from SNMP, LLDP/CDP, ARP caches and switch forwarding tables.", platform: "Win / Linux (+ consoles)", license: "OSS", medium: true },
    { cat: "15", name: "Checkmk Raw", url: "https://checkmk.com/", desc: "Point it at a host or SNMP device and it auto-discovers the services running, then monitors them without hand-writing checks.", platform: "Linux server / web", license: "OSS", medium: true },
    { cat: "15", name: "Observium Community", url: "https://www.observium.org/", desc: "Auto-discovering SNMP platform that finds devices and maps their CDP/LLDP/FDP neighbors so you graph a whole network hands-off.", platform: "Linux (LAMP self-host)", license: "OSS", medium: true, caveat: "Community edition updates only ~every 6 months." },
    { cat: "15", name: "OpenNMS Horizon", url: "https://www.opennms.com/horizon/", desc: "Full OSS monitoring platform that auto-discovers the network and maps L2/L3 link topology (Enlinkd). Heavier — for bigger networks.", platform: "Linux / Docker (Java)", license: "OSS", medium: true },

    // 15 — Mapping & Discovery :: map a single MACHINE
    { cat: "15", name: "Belarc Advisor", url: "https://www.belarc.com/products/belarc-advisor", desc: "One-click local audit → a full HTML report of hardware, software, license keys, missing hotfixes and security status. Nothing leaves the PC.", platform: "Win", license: "Free (personal)", caveat: "Free for personal use only — no corporate/gov use." },
    { cat: "15", name: "WinAudit", url: "https://github.com/Dan-ATKA/Winaudit", desc: "Portable full inventory of one machine — hardware, software + licenses, services, drives, security, network — into a searchable report.", platform: "Win", license: "OSS" },
    { cat: "15", name: "System Informer", url: "https://systeminformer.io/", desc: "Task Manager on steroids (open-source Process Hacker successor) — processes, services, modules, handles and live connections.", platform: "Win", license: "OSS", caveat: "Loads a kernel driver — AV/EDR may flag it." },
    { cat: "15", name: "ServiWin", url: "https://www.nirsoft.net/utils/serviwin.html", desc: "Lists every Windows service and driver color-coded by state; start/stop and change startup type, then export a report.", platform: "Win", license: "Free", caveat: "AV may false-flag NirSoft tools." },
    { cat: "15", name: "WhatInStartup", url: "https://www.nirsoft.net/utils/what_run_in_startup.html", desc: "Lists every program set to auto-run at startup with its command line; disable/delete to fix a slow boot.", platform: "Win", license: "Free", caveat: "AV may false-flag NirSoft tools." },
    { cat: "15", name: "Handle", url: "https://learn.microsoft.com/sysinternals/downloads/handle", desc: "Command-line: find which process has a file/folder open — the fast answer to 'what's locking this file' (and force-close it).", platform: "Win", license: "Free" },
    { cat: "15", name: "Dependencies (lucasg)", url: "https://github.com/lucasg/Dependencies", desc: "Modern open-source Dependency Walker replacement — maps a program's imported DLLs and flags missing ones. Fixes 'X.dll not found.'", platform: "Win", license: "OSS" },
    { cat: "15", name: "FullEventLogView", url: "https://www.nirsoft.net/utils/full_event_log_view.html", desc: "Flattens every Windows Event Log into one searchable, filterable table with full descriptions. Local, remote, or a saved .evtx.", platform: "Win", license: "Free", caveat: "AV may false-flag NirSoft tools." },
    { cat: "15", name: "WhoCrashed", url: "https://www.resplendence.com/whocrashed", desc: "Reads minidump/crash-dump files after a BSOD and names the likely culprit driver in plain English — no debugger skills needed.", platform: "Win", license: "Free (personal)", caveat: "Free Home Edition is non-commercial." },
    { cat: "15", name: "Geek Uninstaller", url: "https://geekuninstaller.com/", desc: "Portable single-exe: lists installed programs, force-removes stubborn apps with leftover cleanup, and exports the list to HTML.", platform: "Win", license: "Free" }
  ]
};
