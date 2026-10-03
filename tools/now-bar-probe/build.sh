#!/bin/sh
# Standalone Android API 36 diagnostic. Does not modify the Expo app or install anything.
set -eu
PROBE_SOURCE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
: "${ANDROID_HOME:?Set ANDROID_HOME to the Android SDK directory}"
: "${JAVA_HOME:?Set JAVA_HOME to a JDK 17 or newer directory}"
PROBE_BUILD="$ANDROID_HOME/build-tools/36.0.0"
PROBE_PLATFORM="$ANDROID_HOME/platforms/android-36/android.jar"
PROBE_KEYSTORE="${ANDROID_USER_HOME:-$HOME/.android}/debug.keystore"
PROBE_OUTPUT=$(mktemp -d "${TMPDIR:-/tmp}/naeryeo-public-probe.XXXXXX")
mkdir -p "$PROBE_OUTPUT/classes" "$PROBE_OUTPUT/dex"
"$JAVA_HOME/bin/javac" -source 17 -target 17 -classpath "$PROBE_PLATFORM" -d "$PROBE_OUTPUT/classes" "$PROBE_SOURCE/src/ProbeActivity.java"
"$PROBE_BUILD/d8" --min-api 36 --lib "$PROBE_PLATFORM" --output "$PROBE_OUTPUT/dex" "$PROBE_OUTPUT"/classes/com/naeryeo/probe/*.class
"$PROBE_BUILD/aapt2" link -I "$PROBE_PLATFORM" --manifest "$PROBE_SOURCE/AndroidManifest.xml" -o "$PROBE_OUTPUT/unsigned.apk"
(cd "$PROBE_OUTPUT/dex" && zip -q -u ../unsigned.apk classes.dex)
"$PROBE_BUILD/zipalign" -f 4 "$PROBE_OUTPUT/unsigned.apk" "$PROBE_OUTPUT/aligned.apk"
"$PROBE_BUILD/apksigner" sign --ks "$PROBE_KEYSTORE" --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android --out "$PROBE_OUTPUT/probe.apk" "$PROBE_OUTPUT/aligned.apk"
"$PROBE_BUILD/apksigner" verify "$PROBE_OUTPUT/probe.apk"
printf '%s\n' "$PROBE_OUTPUT/probe.apk"
