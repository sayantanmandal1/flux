; FLUX installer custom NSIS script
; Adds file-associations options page to installer

!macro customInstall
  ; Register app capabilities
  WriteRegStr HKCU "Software\FluxMediaPlayer" "ApplicationName" "FLUX Media Player"
  WriteRegStr HKCU "Software\FluxMediaPlayer" "ApplicationDescription" "The Ultimate Media Player"
  WriteRegStr HKCU "Software\RegisteredApplications" "FluxMediaPlayer" "Software\FluxMediaPlayer\Capabilities"
  
  ; Shell refresh
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro customUninstall
  DeleteRegKey HKCU "Software\FluxMediaPlayer"
  DeleteRegValue HKCU "Software\RegisteredApplications" "FluxMediaPlayer"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend
