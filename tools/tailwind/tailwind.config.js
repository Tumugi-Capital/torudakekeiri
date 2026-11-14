// ヘルプ・利用規約・プライバシーポリシー・特定商取引法の4ページ用のデザイン（assets/tailwind.css）の設定。
// 4ページのHTMLで使うクラス名を変えたら、tools/tailwind/README.md の手順で作り直す。
module.exports = {
  content: ['../../help.html', '../../terms.html', '../../privacy.html', '../../tokushoho.html'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#f7f1e7', 100: '#efe6d6', 200: '#e6dccb', 500: '#2e5a48', 600: '#234638', 700: '#1f3a2f' },
        cream: '#fffdf9',
        mint: '#dff0e7',
        honey: '#f9efd4'
      },
      boxShadow: {
        soft: '0 14px 34px rgba(45, 55, 45, 0.10)',
        pop: '0 18px 44px rgba(38, 63, 53, 0.24)'
      }
    }
  }
};
