# Notion → note 整形ツール

Notionの書き出しZIPを読み込み、note投稿用にタイトル・本文・画像を整理してコピーするブラウザアプリです。

## 現在の正本

- Version: β 0.8
- Public URL: https://mori-tools.github.io/notion-note-exporter/
- Legacy URL: https://notion-note-exporter.hjjhjjnhjjkhjjkmhjjkm.chatgpt.site
- GitHub: このリポジトリをアプリコードの正本とする
- Google Drive: 配布ZIP・画像素材・旧バージョンの保管
- Notion `HARU_MASTER`: 公開URL・保存場所・更新手順の索引

## β 0.8 の主な変更

- 固定バナー・リンクタブを追加
- HARU TOOLS / 𝕏 / 質問箱にそれぞれ以下を追加
  - 画像コピー
  - ALTコピー
  - URLコピー
- 固定バナー画像3点を同梱

## 更新ルール

1. 修正前に main の最新版を確認する。
2. 修正はGitHubのコードを正本として行う。
3. リリース前に既存機能と追加機能を確認する。
4. mainへの更新後、GitHub Pagesが自動デプロイされる。
5. 配布用ZIPはGoogle Drive `HARU_MASTER / 01_APPS / Notion_note_exporter / 01_LATEST` に保存する。
6. 旧版はGoogle Drive `02_VERSIONS` に残す。
7. 固定画像はGoogle Drive `03_ASSETS` に保存する。
8. 公開後に `HARU_MASTER` のバージョン・変更内容・公開状態を更新する。

## ファイル構成

- `index.html` — アプリ本体
- `sw.js` — Service Worker
- `manifest.webmanifest` — PWA設定
- `icon.svg` — アイコン
- `banner-haru-tools.png` — HARU TOOLSバナー
- `banner-x.png` — 𝕏バナー
- `banner-question.png` — 質問箱バナー

## 管理方針

今後はZIPや過去チャットを編集元として扱わず、このGitHubリポジトリの `main` をコードの唯一の正本とする。公開はGitHub Pagesを使用し、main更新で公開版へ自動反映する。
