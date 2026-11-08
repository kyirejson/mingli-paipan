param(
  [Parameter(Mandatory=$true)][ValidatePattern('^\d+\.\d+\.\d+$')][string]$Version,
  [Parameter(Mandatory=$true)][ValidateRange(9,2147483647)][int]$VersionCode,
  [string]$WorkRoot='D:\zaohua-release-work',
  [string]$JavaHome='C:\Users\28257\jdk17\jdk-17.0.12+7',
  [string]$BuildTools='C:\Users\28257\android-sdk\build-tools\34.0.0'
)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$apktool=Join-Path $WorkRoot 'apktool.jar'
$keyFile=Join-Path $projectRoot 'private-signing\zaohua-release.jks'
$passwordFile=Join-Path $projectRoot 'private-signing\keystore-password.txt'
$java=Join-Path $JavaHome 'bin\java.exe'
$locked=Get-Content -LiteralPath (Join-Path $projectRoot 'build-inputs.json') -Raw | ConvertFrom-Json
foreach($file in @($apktool,$keyFile,$passwordFile,$java,(Join-Path $BuildTools 'apksigner.bat'),(Join-Path $BuildTools 'zipalign.exe'))){if(-not(Test-Path -LiteralPath $file)){throw "Missing build input: $file"}}
if((Get-FileHash -LiteralPath $apktool -Algorithm SHA256).Hash -ne $locked.apktool.sha256){throw 'Apktool hash does not match build-inputs.json.'}
$taskRoot=Join-Path $WorkRoot ('build-'+$Version+'-'+[guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $taskRoot -Force | Out-Null
$oldTemp=$env:TEMP;$oldTmp=$env:TMP;$oldJava=$env:JAVA_HOME
function CheckExit([string]$step){if($LASTEXITCODE -ne 0){throw "$step failed (exit $LASTEXITCODE)"}}
try{
  $env:TEMP=Join-Path $taskRoot 'temp';$env:TMP=$env:TEMP;$env:JAVA_HOME=$JavaHome
  New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
  $decoded=Join-Path $taskRoot 'decoded';$framework=Join-Path $WorkRoot 'framework'
  & python (Join-Path $PSScriptRoot 'prepare-runtime.py') --destination $decoded --version $Version --version-code $VersionCode;CheckExit 'Repository native runtime'
  Copy-Item -Path (Join-Path $projectRoot 'dist\*') -Destination (Join-Path $decoded 'assets\public') -Recurse -Force
  Remove-Item -LiteralPath (Join-Path $decoded 'assets\public\static\data\tiku_tilin_all.json') -Force -ErrorAction SilentlyContinue
  & python (Join-Path $PSScriptRoot 'build-data-vault.py') --decoded $decoded --work (Join-Path $taskRoot 'vault-plugin') --java-home $JavaHome --build-tools $BuildTools --android (Join-Path (Split-Path -Parent (Split-Path -Parent $BuildTools)) 'platforms\android-34\android.jar');CheckExit 'Data vault plugin'
  [System.IO.File]::WriteAllText((Join-Path $decoded 'assets\public\static\update-info.json'), (@{version=$Version;versionCode=$VersionCode;repository='https://github.com/kyirejson/mingli-paipan'} | ConvertTo-Json -Compress), [System.Text.UTF8Encoding]::new($false))
  $unsigned=Join-Path $taskRoot 'unsigned.apk';$aligned=Join-Path $taskRoot 'aligned.apk';$signed=Join-Path $taskRoot 'signed.apk'
  & $java "-Djava.io.tmpdir=$($env:TEMP)" -jar $apktool b -p $framework $decoded -o $unsigned;CheckExit 'Rebuild'
  & (Join-Path $BuildTools 'zipalign.exe') -f -p 4 $unsigned $aligned;CheckExit 'Alignment'
  & (Join-Path $BuildTools 'apksigner.bat') sign --ks $keyFile --ks-key-alias zaohua --ks-pass "file:$passwordFile" --out $signed $aligned;CheckExit 'Signing'
  & (Join-Path $BuildTools 'apksigner.bat') verify --verbose --print-certs $signed;CheckExit 'Signature verification'
  & (Join-Path $BuildTools 'zipalign.exe') -c -p 4 $signed;CheckExit 'Alignment verification'
  $outDir=Join-Path $projectRoot 'release\android';New-Item -ItemType Directory -Path $outDir -Force | Out-Null
  $output=Join-Path $outDir "zaohua-v$Version.apk";if(Test-Path -LiteralPath $output){throw "Refusing to overwrite existing artifact: $output"}
  Copy-Item -LiteralPath $signed -Destination $output
  Write-Output "Built $output"
  Write-Output "SHA256: $((Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash)"
}finally{$env:TEMP=$oldTemp;$env:TMP=$oldTmp;$env:JAVA_HOME=$oldJava}
