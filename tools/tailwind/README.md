# サブページのデザイン（assets/tailwind.css）の作り直し方

ヘルプ・利用規約・プライバシーポリシー・特定商取引法の4ページは、
前もって作った `assets/tailwind.css` を読み込みます（外部サイトでその場で組み立てる方式は、表示が遅く不安定なため使わない）。

4ページのHTMLで、新しいクラス名（`text-sm` `mt-4` など）を使ったときだけ、次を実行して作り直します。

```sh
cd tools/tailwind
npx tailwindcss@3.4.17 -c tailwind.config.js -i input.css -o ../../assets/tailwind.css --minify
```
