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

### X11/LXDEの場合

`~/.config/lxsession/LXDE-pi/autostart` を作成/編集し、以下を追記:

```
@xset s off
@xset -dpms
@xset s noblank
@chromium-browser --noerrdialogs --disable-infobars --kiosk https://<デプロイ後のVercel URL>/display
```

### Wayland/labwcの場合

`~/.config/labwc/autostart` を作成/編集し、以下を追記:

```
chromium-browser --noerrdialogs --disable-infobars --kiosk https://<デプロイ後のVercel URL>/display &
```

`<デプロイ後のVercel URL>` は実際にVercelにデプロイしたドメインに置き換える。

## 3. 夜間・不在時間帯のディスプレイOFF

ラズパイ本体は起動したままにし、HDMI出力(ディスプレイ電源)のみソフト的にOFF/ONする。

```
crontab -e
```

以下を追記(例: 23時に消灯、8時に点灯。運用時間に合わせて調整):

```
0 23 * * * /usr/bin/vcgencmd display_power 0
0 8 * * * /usr/bin/vcgencmd display_power 1
```

## 4. 動作確認

- ラズパイ起動 → 自動ログイン → Chromiumがキオスクモードで `/display` を全画面表示することを確認
- 学生会の管理画面で申請を承認 → 最大60秒以内(ポーリング間隔)に表示クライアントのローテーションに反映されることを確認
- 動画がない場合は「掲示中のコンテンツはありません」と表示されることを確認
