# 🧹 Cache & Cookie Cleanup Script

## Browser Cleanup Instructions

### Chrome/Edge/Brave:
1. **Buka Developer Tools**: `F12` atau `Ctrl+Shift+I`
2. **Klik tab Application**
3. **Expand Storage**
4. **Hapus semua untuk domains berikut:**
   - `localhost:3001`
   - `punch-bible-advocate-burton.trycloudflare.com`
   - `lots-thesis-many-replaced.trycloudflare.com`
   - `app.imajinasset.biz.id`

**Klik kanan pada:**
- Local storage → Clear
- Session storage → Clear
- Cookies → Clear
- Cache storage → Clear

### Firefox:
1. **Buka Developer Tools**: `F12`
2. **Klik tab Storage**
3. **Expand Cookies dan Local Storage**
4. **Hapus semua untuk domains yang relevan**

### Safari:
1. **Buka Develop menu** (Enable di Preferences → Advanced)
2. **Show Web Inspector**
3. **Tab Storage → Clear All**

## Server-Side Cleanup (Already Done ✅)

✅ Next.js build cache cleared
✅ Node.js cache cleared
✅ npm cache cleaned
✅ Server restarted fresh
✅ New tunnel created

## Fresh URLs:

- **Local**: http://localhost:3001
- **Tunnel**: https://punch-bible-advocate-burton.trycloudflare.com

## Additional Cleanup Commands:

```bash
# Clear all browser data via command line (Chrome)
chrome --clear-data

# Clear via PowerShell (Windows)
Get-CimInstance -Class Win32_UserProfile | Remove-CimInstance -Verbose

# Clear temporary files
del /s /q "%TEMP%\*"
del /s /q "%USERPROFILE%\AppData\Local\Temp\*"
```

## Test Fresh Session:

1. Buka browser baru/incognito window
2. Visit: https://punch-bible-advocate-burton.trycloudflare.com
3. Login fresh tanpa cache lama