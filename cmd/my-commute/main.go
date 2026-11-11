package main

import (
	"github.com/oneworkspacestudio/my-commute/internal/commute"
	"github.com/oneworkspacestudio/my-commute/internal/webui"
	"github.com/oneworkspacestudio/one-workspace/pkg/apphost"
	"os"
	"path/filepath"
	"strings"
)

var version = "0.1.0-preview.6"

func main() {
	hasData := false
	for _, v := range os.Args[1:] {
		if v == "--data" || strings.HasPrefix(v, "--data=") {
			hasData = true
		}
	}
	if !hasData {
		root, e := os.UserConfigDir()
		if e != nil {
			apphost.Report(e)
			os.Exit(1)
		}
		os.Args = append(os.Args, "--data", filepath.Join(root, "OneWorkspace", "MyCommute"))
	}
	if e := apphost.Main(apphost.Config{ID: "commute", Name: "My Commute", Version: version, Listen: "127.0.0.1:9040", Geolocation: true}, webui.Files(), func(h *apphost.Host) (apphost.Application, error) { return commute.New(h) }); e != nil {
		apphost.Report(e)
		os.Exit(1)
	}
}
