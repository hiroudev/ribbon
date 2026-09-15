# アイコンの変更

元画像：ユーザー提供のオレンジ／ネイビーのブックマーク形リボン。

白いChromeツールバーで見つけやすくするため、土台をネイビー、リボンの暗色部分をアイボリーへ変更しました。16・32・48・128pxのPNGを拡張に組み込んでいます。

使用ツール：組み込みの `image_gen`。元の画像を編集対象に指定しました。サイズ展開はSystem.Drawingで行っています。

最終アセット：`public/icons/ribbon-source.png`

## 編集プロンプト

1. Preserve the recognizable folded bookmark ribbon silhouette and orange accent from the source. Change the large white rounded-square base to solid deep navy #203449. Change the navy portion of the bookmark ribbon to warm ivory #FFF6E8 so it is clearly visible against the navy base; retain the rich orange upper/right folded ribbon. Simplify fine textures and shadows for small-size readability, with bold clean edges. Center and enlarge mark slightly inside the rounded square with a narrow safe margin. Square PNG with real transparent background outside the rounded-square base; no white outer glow, no text, no mockup, no extra objects. This is the production extension icon.
2. Edit this icon. Keep the orange and ivory folded bookmark symbol exactly as is. Replace ONLY the gray checkerboard area outside the navy rounded-square tile with the same solid deep navy #203449 as the tile, making this a full bleed opaque square navy icon. No transparency. No checkerboard anywhere. No outer margin or white background. Preserve the symbol's shape, color and position. Production Chrome toolbar icon, clean simple edges.

初回の出力は外周にチェック模様を含んだため採用せず、2回目の不透明なネイビー背景版を使用しています。
