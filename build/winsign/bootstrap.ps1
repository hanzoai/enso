(New-Object System.Net.WebClient).DownloadFile("https://ftp.mozilla.org/pub/mozilla/libraries/win32/MozillaBuildSetup-Latest.exe", "C:\MozillaBuildSetup-Latest.exe")
C:\MozillaBuildSetup-Latest.exe /S | out-null

rustup target add aarch64-pc-windows-msvc
rustup target add x86_64-pc-windows-msvc

cp -r tests engine/browser/base/zen-components/
