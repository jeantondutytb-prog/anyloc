; The downloaded installer is Anyloc-Setup.exe.
; The installed app is Anyloc.exe and stays in the tray when the window is closed.
; Kill it first so the new files actually replace the old ones.
!macro customInit
  nsExec::ExecToLog 'taskkill /F /IM Anyloc.exe /T'
  Sleep 2000
!macroend

!macro customUnInit
  nsExec::ExecToLog 'taskkill /F /IM Anyloc.exe /T'
  Sleep 1000
!macroend
