
pref("widget.gtk.rounded-bottom-corners.enabled", true);

// Enable transparent background for linux
#ifdef MOZ_WIDGET_GTK
pref('zen.widget.linux.transparency', false);

// VAAPI/FFMPEG is Linux only
pref('media.ffmpeg.vaapi.enabled', true);
pref('media.ffmpeg.encoder.enabled', true);
#endif
