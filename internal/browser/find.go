package browser

import (
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

// FindExecutable looks for an installed Chromium-based browser: Chrome,
// Chromium, Edge or Brave. Edge ships with Windows, so nothing extra needs
// downloading there.
func FindExecutable() (string, error) {
	var names, paths []string
	switch runtime.GOOS {
	case "windows":
		names = []string{"chrome", "msedge", "chromium", "brave"}
		for _, env := range []string{"ProgramFiles", "ProgramFiles(x86)", "LocalAppData"} {
			root := os.Getenv(env)
			if root == "" {
				continue
			}
			paths = append(paths,
				filepath.Join(root, `Google\Chrome\Application\chrome.exe`),
				filepath.Join(root, `Microsoft\Edge\Application\msedge.exe`),
				filepath.Join(root, `Chromium\Application\chrome.exe`),
				filepath.Join(root, `BraveSoftware\Brave-Browser\Application\brave.exe`),
			)
		}
	case "darwin":
		paths = []string{
			"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
			"/Applications/Chromium.app/Contents/MacOS/Chromium",
			"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
			"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
		}
		names = []string{"google-chrome", "chromium"}
	default:
		names = []string{"google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome", "microsoft-edge", "brave-browser"}
		home, _ := os.UserHomeDir()
		for _, pattern := range []string{
			"/opt/pw-browsers/chromium-*/chrome-linux*/chrome",
			filepath.Join(home, ".cache/ms-playwright/chromium-*/chrome-linux*/chrome"),
		} {
			matches, _ := filepath.Glob(pattern)
			paths = append(paths, matches...)
		}
	}
	for _, p := range paths {
		if st, err := os.Stat(p); err == nil && !st.IsDir() {
			return p, nil
		}
	}
	for _, n := range names {
		if p, err := exec.LookPath(n); err == nil {
			return p, nil
		}
	}
	return "", errors.New("no Chrome, Chromium, Edge or Brave found; install one or pass --chrome /path/to/browser (or set ASTROLABE_CHROME)")
}
