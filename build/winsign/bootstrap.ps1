(New-Object System.Net.WebClient).DownloadFile("https://ftp.mozilla.org/pub/mozilla/libraries/win32/MozillaBuildSetup-Latest.exe", "C:\MozillaBuildSetup-Latest.exe")
C:\MozillaBuildSetup-Latest.exe /S | out-null

rustup target add aarch64-pc-windows-msvc
rustup target add x86_64-pc-windows-msvc

cd engine
./mach python --virtualenv build taskcluster/scripts/misc/get_vs.py build/vs/vs2022.yaml ../win-cross/vs2022
cd ..
