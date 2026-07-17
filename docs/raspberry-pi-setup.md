# ラズパイ(表示クライアント)セットアップ手順

対象機種: Raspberry Pi 4 Model B / Raspberry Pi OS (64-bit)

## 1. 自動ログインの有効化

```
sudo raspi-config
```
`System Options` → `Boot / Auto Login` → `Desktop Autologin` を選択。

## 2. Chromiumキオスクモードの自動起動

Raspberry Pi OS のバージョンによってデスクトップ環境が異なる(Bookworm以降はWayland/labwcがデフォルト、
それ以前はX11/LXDE)。まず以下で確認する。

```
echo $XDG_SESSION_TYPE
```

### 起動用スクリプトを作成する(共通)

ラズパイ起動直後はWi-Fi接続が確立する前にChromiumが立ち上がってしまい、DNSエラー画面のまま
固まることがある(実機検証で発生を確認済み)。ページ側のコード([DisplayClient.tsx](../src/app/display/DisplayClient.tsx))は
一度正常に読み込んだ後のポーリング失敗には耐性があるが、初回読み込み自体の失敗はブラウザ側の
問題のためアプリコードでは救えない。そのため起動スクリプト側でネットワーク接続を待つ。

`~/start-kiosk.sh` を作成:

```bash
#!/bin/bash
# ネットワーク接続が確立するまで待つ(2秒間隔、最大60回=約2分)
for i in $(seq 1 60); do
  if curl -s --head --max-time 3 https://signage-ad.vercel.app > /dev/null 2>&1; then
    break
  fi
  sleep 2
done

chromium-browser --noerrdialogs --disable-infobars --kiosk https://signage-ad.vercel.app/display
```

実行権限を付与:

```
chmod +x ~/start-kiosk.sh
```

### X11/LXDEの場合

`~/.config/lxsession/LXDE-pi/autostart` を作成/編集し、以下を追記:

```
@xset s off
@xset -dpms
@xset s noblank
@/home/ユーザー名/start-kiosk.sh
```

### Wayland/labwcの場合

`~/.config/labwc/autostart` を作成/編集し、以下を追記:

```
$HOME/start-kiosk.sh &
```

## 3. 夜間・不在時間帯のディスプレイOFF

ラズパイ本体は起動したままにし、HDMI出力(ディスプレイ電源)のみソフト的にOFF/ONする。

```
crontab -e
```

以下を追記(20時消灯・8時点灯):

```
0 20 * * * /usr/bin/vcgencmd display_power 0
0 8 * * * /usr/bin/vcgencmd display_power 1
```

## 4. 動作確認

- ラズパイ起動 → 自動ログイン → Chromiumがキオスクモードで `/display` を全画面表示することを確認
- 学生会の管理画面で申請を承認 → 最大60秒以内(ポーリング間隔)に表示クライアントのローテーションに反映されることを確認
- 動画がない場合は「掲示中のコンテンツはありません」と表示されることを確認
