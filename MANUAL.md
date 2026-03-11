# Pokemon ダメージ計算ツール - 完全説明書

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [技術スタック](#2-技術スタック)
3. [ディレクトリ構造](#3-ディレクトリ構造)
4. [型定義 (types.ts)](#4-型定義-typests)
5. [データ層](#5-データ層)
6. [コア計算エンジン](#6-コア計算エンジン)
7. [ライブラリ層 (lib/)](#7-ライブラリ層-lib)
8. [サーバーアクション (actions.ts)](#8-サーバーアクション-actionsts)
9. [メインUIコンポーネント (DamageCalculator.tsx)](#9-メインuiコンポーネント-damagecalculatortsx)
10. [状態管理](#10-状態管理)
11. [機能詳細](#11-機能詳細)
12. [データフロー](#12-データフロー)
13. [localStorage設計](#13-localstorage設計)
14. [翻訳システム](#14-翻訳システム)
15. [既知のルールと注意点](#15-既知のルールと注意点)

---

## 1. プロジェクト概要

**アプリ名**: Pokemon ダメージ計算ツール (damage-calc-web)

ポケモン対戦（ダブルバトル想定）において、自分のポケモンがメタポケモンたちに対してどれだけのダメージを与え/受けるかを一括計算するWebアプリ。さらに、KO/耐えに必要な最小EVラインも自動探索する。

**主な用途**:
- 育成論作成の補助（どの相手に何発耐えるかを一括確認）
- 攻撃ライン探索（何振りあれば確定1発か）
- 防御ライン探索（何振りあれば何発耐えるか）
- メタポケモンのボックス管理（カスタム相手セット）

---

## 2. 技術スタック

| 技術 | バージョン | 役割 |
|------|-----------|------|
| Next.js | 16.1.4 | Reactフレームワーク（App Router） |
| React | 19.2.3 | UIライブラリ |
| TypeScript | 5 | 型安全な開発 |
| Tailwind CSS | 4 | スタイリング |
| @smogon/calc | ^0.10.0 | ダメージ計算エンジン本体 |
| fs-extra | ^11.3.3 | サーバー側ファイルI/O |

**@smogon/calc** はSmogon（世界最大の対戦コミュニティ）の公式ダメージ計算ライブラリ。ゲーム内の計算式を正確に再現している。

---

## 3. ディレクトリ構造

```
damage-calc-web/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # ルートレイアウト（アニメ背景ブロブ付き）
│   │   ├── page.tsx            # ホームページ（サーバーコンポーネント）
│   │   └── actions.ts          # サーバーアクション（ファイルI/O・計算）
│   │
│   ├── components/
│   │   └── DamageCalculator.tsx # メインUIコンポーネント（全機能の中心）
│   │
│   ├── core/
│   │   ├── calculator.ts       # ダメージ計算クラス
│   │   ├── lineExplorer.ts     # EVライン探索クラス
│   │   └── translator.ts       # 英日翻訳システム
│   │
│   ├── lib/
│   │   ├── logic.ts            # 計算ロジックのオーケストレーション
│   │   ├── storage.ts          # localStorageのボックス管理
│   │   └── pokepaste.ts        # PokePaste形式のパース・フォーマット
│   │
│   ├── data/
│   │   ├── meta_pokemons.ts    # 生成済みメタポケモンリスト（展開後）
│   │   ├── meta_definitions.ts # メタポケモン基本定義（展開前）
│   │   ├── meta_ranking.ts     # ポケモンごとの持ち物オプション
│   │   ├── ability_branches.ts # 特性バリアント展開ルール
│   │   ├── learnsets.json      # ポケモン別習得技リスト
│   │   ├── moves_multilang.json     # 技名の多言語データ
│   │   ├── pokedex_multilang.json   # ポケモン名の多言語データ
│   │   └── abilities_multilang.json # 特性名の多言語データ
│   │
│   ├── configs/pokemons/
│   │   └── *.json              # 36体分のプリセットポケモン設定
│   │
│   ├── workers/
│   │   └── calc.worker.ts      # Web Worker（バックグラウンド計算用・将来用）
│   │
│   ├── reporting/
│   │   └── csvWriter.ts        # CSV出力ユーティリティ
│   │
│   └── types.ts                # 全TypeScript型定義
│
├── public/                     # 静的アセット
├── package.json
├── tsconfig.json               # TypeScript設定
├── next.config.ts              # Next.js設定（最小）
└── postcss.config.mjs          # PostCSS/Tailwind設定
```

---

## 4. 型定義 (types.ts)

アプリ全体で使われる型を定義するファイル。

### 基本型エイリアス

```typescript
type TypeName    // タイプ名（"Fire", "Water"など）
type AbilityName // 特性名
type ItemName    // 持ち物名
type NatureName  // 性格名
type MoveName    // 技名
```

### PokemonStats

```typescript
interface PokemonStats {
  hp: number
  atk: number
  def: number
  spa: number
  spd: number
  spe: number
}
```
HP・攻撃・防御・特攻・特防・素早さの6つの数値。EVs、IVs、ranks（ランク変化）の型として使われる。

### UserPokemonConfig

```typescript
interface UserPokemonConfig {
  species: string        // ポケモン名（英語）
  level: number          // レベル（通常50）
  nature: NatureName     // 性格
  ability: AbilityName   // 特性
  item: ItemName         // 持ち物
  evs: PokemonStats      // 努力値
  ivs: PokemonStats      // 個体値
  ranks: PokemonStats    // ランク変化
  moves: MoveName[]      // 技（最大4つ）
  teraType: TypeName     // テラスタイプ
  boosts: {...}          // 特殊なステータスブースト
  overrides: {...}       // ステータス上書き（計算用）
  remarks: string        // メモ
}
```

自分のポケモン設定。configs/pokemons/*.jsonからロードするか、UI上で編集する。

### MetaPokemonVariant

```typescript
interface MetaPokemonVariant {
  species: string
  item?: ItemName
  nature?: NatureName
  ability?: AbilityName
  evs?: Partial<PokemonStats>
  moves?: MoveName[]
  teraType?: TypeName
  extraLabel?: string     // 表示用の追加ラベル（"(Active)"など）
  forcedField?: Partial<GlobalFieldState>  // このポケモン専用のフィールド設定
  overrides?: {...}       // ステータス直接指定
  boosts?: {...}
  remarks?: string
  // 型定義にはないが計算上必須:
  // level: 50, ivs: {全31}, ranks: {全0}
}
```

対戦相手（メタポケモン）の定義。`extraLabel`でActive/Inactive等のバリアントを表現。

### CalculationResult

```typescript
interface CalculationResult {
  attacker: string       // 攻撃者のポケモン名
  defender: string       // 防御者のポケモン名
  move: string           // 使用技名
  damage: number[]       // ダメージの範囲（最小〜最大の16通り）
  params: {...}          // 計算に使用したパラメータ
}
```

### GlobalFieldState

```typescript
interface GlobalFieldState {
  weather: string        // 天候（"Sun", "Rain", "Sand", "Snow", ""）
  terrain: string        // フィールド（"Electric", "Grassy", "Psychic", "Misty", ""）
  userSide: {
    isReflect: boolean   // リフレクター
    isLightScreen: boolean  // ひかりのかべ
    isAuroraVeil: boolean   // オーロラベール
  }
  opponentSide: {
    isReflect: boolean
    isLightScreen: boolean
    isAuroraVeil: boolean
  }
  isMagicRoom: boolean   // マジックルーム
  isGravity: boolean     // じゅうりょく
}
```

### CalculationSettings

```typescript
interface CalculationSettings {
  abilityVariantMode: VariantFilterMode  // 特性バリアントのフィルター
  teraVariantMode: VariantFilterMode     // テラバリアントのフィルター
  excludeWeakMoves: boolean              // 弱い技を除外するか
  showRemarks: boolean                   // メモを表示するか
  defLineMode: DefLineMode               // 防御ラインの計算方式
}
```

### PokemonBox

```typescript
interface PokemonBox {
  id: string                    // 'default' or 'box-{timestamp}'
  name: string                  // ボックス名
  opponents: MetaPokemonVariant[] // ポケモンリスト
  excludedIds: string[]         // 計算から除外するポケモンのID
  isDefault: boolean            // デフォルトボックスか
  createdAt: number             // 作成日時（Unix timestamp）
}
```

### 列挙型

```typescript
type VariantFilterMode = 'default' | 'active-only' | 'inactive-only'
// default: 全バリアント表示
// active-only: Activeバリアントのみ
// inactive-only: Inactiveバリアントのみ

type DefLineMode = 'hp-bias' | 'efficient'
// hp-bias: HP優先の防御ライン
// efficient: 耐久効率重視の防御ライン
```

---

## 5. データ層

### meta_definitions.ts

メタポケモンの「原型」を定義するファイル。ここに書かれたデータが`ability_branches.ts`と`meta_ranking.ts`によって展開される。

各エントリは以下の形式:
```typescript
{
  species: "Incineroar",
  ability: "Intimidate",
  nature: "Brave",
  evs: { hp: 252, atk: 164, def: 60, spa: 0, spd: 28, spe: 4 },
  moves: ["Fake Out", "Flare Blitz", "Close Combat", "Parting Shot"],
  teraType: "Fire"
}
```

### ability_branches.ts

特性によって「Active/Inactive」バリアントを生成するルール。

```typescript
// 例: テイルウィンドを持つポケモンは天候があるとき/ないときで変わる
"Oricorio-Pom-Pom": {
  branchType: "weather-setter",
  activeField: { weather: "Electric" }
}
```

バリアントの種類:
- **weather-setter**: 天候発動ポケモン（日照り、雨etc）
- **terrain-setter**: フィールド発動ポケモン
- **status-ability**: 状態異常で変わる特性（ガッツ、ふしぎなうろこ）
- **toggle**: 手動で切り替えるもの（もらいび）

### meta_ranking.ts

ポケモンごとに持ち物の候補を定義。ここに複数アイテムが書かれると、各アイテムのバリアントが生成される。

```typescript
"Incineroar": ["Safety Goggles", "Assault Vest", "Sitrus Berry"]
// → 3つのバリアントが生成される
```

### meta_pokemons.ts

`meta_definitions.ts` + `ability_branches.ts` + `meta_ranking.ts` を組み合わせて展開済みの全バリアントリスト。計算時はこのリストが使われる。

### learnsets.json

```json
{
  "Incineroar": ["Fake Out", "Flare Blitz", "Close Combat", ...]
}
```

各ポケモンが覚えられる技の一覧。技入力のオートコンプリートに使用。

### moves_multilang.json / pokedex_multilang.json / abilities_multilang.json

```json
{
  "Flare Blitz": { "ja": "フレアドライブ", "en": "Flare Blitz" },
  ...
}
```

英語/日本語の相互翻訳に使用。

### configs/pokemons/*.json

プリセットポケモン設定ファイル（36体分）。`UserPokemonConfig`形式のJSONファイル。

例 `incineroar.json`:
```json
{
  "species": "Incineroar",
  "level": 50,
  "nature": "Brave",
  "ability": "Intimidate",
  "item": "Safety Goggles",
  "evs": { "hp": 252, "atk": 164, "def": 60, "spa": 0, "spd": 28, "spe": 4 },
  "ivs": { "hp": 31, "atk": 31, "def": 31, "spa": 31, "spd": 31, "spe": 0 },
  "ranks": { "hp": 0, "atk": 0, "def": 0, "spa": 0, "spd": 0, "spe": 0 },
  "moves": ["Fake Out", "Flare Blitz", "Close Combat", "Parting Shot"],
  "teraType": "Fire",
  "remarks": ""
}
```

---

## 6. コア計算エンジン

### calculator.ts (DamageCalculatorクラス)

`@smogon/calc`のラッパークラス。

#### `toCalcPokemon(config, isAttacker, overrideField?)`

`UserPokemonConfig`または`MetaPokemonVariant`を`@smogon/calc`の`Pokemon`オブジェクトに変換する。

重要な処理:
- テラスタイプの適用（Stellarタイプの特殊処理）
- 性格によるステータス計算
- ランク変化の適用
- 持ち物・特性の設定
- forcedFieldによるフィールド上書き

**Stellarテラスタイプの特殊処理**:
Stellarは攻撃時にのみ全タイプへのボーナスがあり、防御時は元のタイプを維持する必要がある。そのため攻撃者と防御者で異なる処理を行う。

#### `calculateDamage(attacker, attackerField, move, defender, defenderField)`

攻撃者視点でダメージを計算する。

戻り値:
```typescript
{
  damage: number[]      // 16通りのダメージ値
  koChance: string      // "確定1発", "87.5%", "乱数2発"など
  percentages: string   // "60.5% ~ 71.3%"
}
```

#### `calculateReceivedDamage(attacker, move, defender, defenderField)`

防御者視点で受けるダメージを計算する。

### lineExplorer.ts (LineExplorerクラス)

EVライン（ダメージ閾値に届く/耐える最小努力値）を二分探索で求める。

#### `findOffensiveLine(attacker, move, defender, defenderField, target)`

目標KO確率に届く攻撃側の最小EVを探索する。

```typescript
// 例: ガオガエンが確定1発にするための最小攻撃EV
findOffensiveLine(incineroar, "Flare Blitz", opponent, field, "ohko")
// → { stat: "atk", ev: 252, nature: "Adamant" }
```

探索の流れ:
1. 各攻撃ステータス（atk/spa）について探索
2. 有利性格で探索 → 見つからなければ無補正性格で再探索
3. 二分探索で最小EVを特定

#### `findDefensiveLine(defender, move, attacker, attackerField, threshold)`

指定された閾値（耐え数）に必要な防御側の最小EVを探索する。

```typescript
// 例: 2発耐えるための最小HP/防御EV
findDefensiveLine(incineroar, "Flare Blitz", attacker, field, "2hit")
// → { hpEv: 252, defEv: 4, mode: "hp-bias" }
```

DefLineMode:
- **hp-bias**: HP最大優先（HPから先に積む）
- **efficient**: 耐久効率最適化（HP:防御比を考慮）

### translator.ts

英語/日本語の相互翻訳システム。

```typescript
// 使い方
t("Incineroar")       // → "ガオガエン"
t("ガオガエン")         // → "Incineroar"
tType("Fire")         // → "ほのお"
registerTranslations(dict)  // 翻訳辞書を登録
toEnglish("ガオガエン")     // → "Incineroar"
```

地域フォーム（"Incineroar-Alola"など）の重複を防ぐフィルタリングも行う。

---

## 7. ライブラリ層 (lib/)

### logic.ts

計算全体のオーケストレーション（指揮）を担う。

#### `calculateDamageForConfig(userConfig, globalField, opponents, settings)`

メイン計算関数。以下を返す:

```typescript
{
  attackResults: AttackTableRow[]    // 攻撃タブ用データ
  defenseResults: DefenseTableRow[]  // 防御タブ用データ
  defLineResults: DefLineTableRow[]  // 防御ラインタブ用データ
  offLineResults: OffLineTableRow[]  // 攻撃ラインタブ用データ
}
```

処理の流れ:
1. `VariantFilterMode`で対戦相手バリアントをフィルタリング
2. 各相手に対してダメージ計算
3. 防御ライン・攻撃ラインを探索
4. 結果を重複除去・並び替え

#### `deduplicateResults(results)`

同一の計算結果（ポケモン・技・ダメージが全て同じ）を除去する。

#### `filterRedundantSameResult(results)`

同一ポケモンの複数バリアント結果から優先度の高いものだけを残す。

#### `isInactiveLabel(label)`

`extraLabel`が"(Inactive)"を含むかチェック。

#### `filterVariantsByMode(variants, mode)`

```typescript
// mode: 'default' → 全て返す
// mode: 'active-only' → Activeバリアントのみ
// mode: 'inactive-only' → Inactiveバリアントのみ
filterVariantsByMode(opponents, 'active-only')
```

### storage.ts

localStorageを使ったボックス管理。

#### `loadBoxes(): BoxesState | null`

localStorageから`BoxesState`を読み込む。データが壊れている場合はnullを返す。

#### `saveBoxes(state: BoxesState): boolean`

localStorageに保存する。容量オーバーの場合は日本語でアラートを表示し、falseを返す。

#### `initializeBoxes(metaOpponents: MetaPokemonVariant[]): BoxesState`

初回起動時の初期化。デフォルトボックスにメタポケモンをセットする。

#### `createBox(name: string, opponents?: MetaPokemonVariant[]): PokemonBox`

新しいカスタムボックスを作成する。IDは`'box-{timestamp}'`形式。

#### `createDefaultBox(metaOpponents: MetaPokemonVariant[]): PokemonBox`

デフォルトボックス（"伝説レギュ上位"）を作成する。IDは常に`'default'`。

#### `cloneBox(box: PokemonBox): PokemonBox`

ボックスを新しいIDでディープコピーする。

#### `exportBoxes(state: BoxesState): string`

ボックス状態をJSON文字列にシリアライズ。バックアップ・共有用。

#### `importBoxes(json: string): BoxesState`

JSON文字列からボックス状態を復元する。バリデーション付き。

### pokepaste.ts

Smogon公式のPokePaste形式（テキスト）のパース・フォーマット。

#### PokePaste形式の例

```
Incineroar @ Safety Goggles
Ability: Intimidate
Level: 50
EVs: 252 HP / 164 Atk / 60 Def / 28 SpD / 4 Spe
Brave Nature
IVs: 0 Spe
- Fake Out
- Flare Blitz
- Close Combat
- Parting Shot
```

#### `parsePokePaste(text): UserPokemonConfig | null`

1体分のPokePasteテキストを`UserPokemonConfig`に変換する。

#### `parseMultiplePokePaste(text): UserPokemonConfig[]`

複数体分のPokePasteテキストを解析する。空行で区切られた各ブロックを処理。

#### `formatToPokePaste(config): string`

`UserPokemonConfig`をPokePaste形式のテキストに変換する。

#### `formatMultipleToPokePaste(configs): string`

複数のポケモン設定をまとめてPokePaste形式に変換する。

#### `parseEVs(text): Partial<PokemonStats>`

`"252 HP / 4 Atk / 252 SpD"` 形式の文字列を`PokemonStats`に変換する。

---

## 8. サーバーアクション (actions.ts)

Next.jsのサーバーサイドで実行される関数群。`"use server"`ディレクティブで定義。

### `getAvailableConfigs(): Promise<string[]>`

`src/configs/pokemons/`ディレクトリのJSONファイル名一覧を返す。プリセット選択のドロップダウン用。

### `loadConfig(filename: string): Promise<UserPokemonConfig | null>`

指定ファイル名のJSON設定をロードして`UserPokemonConfig`として返す。

### `getAllSpecies(): Promise<string[]>`

`pokedex_multilang.json`からポケモン名の一覧（英語）を返す。オートコンプリート用。

### `getAllMoves(): Promise<string[]>`

`moves_multilang.json`から技名の一覧（英語）を返す。

### `getLearnset(species: string): Promise<string[]>`

指定ポケモンの習得可能技リストを返す。技入力フィールドで使用。

### `getTranslationData(): Promise<Record<string, {ja: string}>>`

全ての翻訳データ（ポケモン名・技名・特性名）をまとめて返す。

### `getMetaOpponents(): Promise<MetaPokemonVariant[]>`

`meta_pokemons.ts`から展開済みメタポケモンリストを返す。

### `calculateCustom(userConfig, globalField, opponents, settings)`

サーバー側でダメージ計算を実行する。`logic.ts`の`calculateDamageForConfig()`を呼び出す。

---

## 9. メインUIコンポーネント (DamageCalculator.tsx)

アプリの全UI・インタラクションを担う大型Reactコンポーネント。

### サブコンポーネント

#### `Table`

計算結果をページネーション付きテーブルで表示する。

Props:
```typescript
{
  columns: Column[]        // カラム定義
  data: Row[]              // 表示データ
  pageSize?: number        // 1ページの行数（デフォルト25）
  onRowClick?: (row) => void  // 行クリックハンドラ
}
```

特徴:
- ポケモン/アイテム/タイプのアイコンを遅延読み込み
- アイコン読み込みエラー時は代替テキスト表示
- `key={species}`でアイコンエラー後のDOM再生成

#### `RowDetailPopup`

テーブル行をクリックした時に表示されるモーダル。詳細な計算パラメータを表示する。

Props:
```typescript
{
  row: Row | null          // 表示する行データ（nullで非表示）
  onClose: () => void      // 閉じるハンドラ
}
```

#### `AutocompleteInput`

入力候補サジェスト付きのテキスト入力コンポーネント。

Props:
```typescript
{
  value: string
  onChange: (value: string) => void
  options: string[]         // サジェスト候補
  placeholder?: string
  className?: string
}
```

特徴:
- 入力文字で候補をフィルタリング
- キーボードナビゲーション対応（矢印キー・Enter）
- 日本語入力でも英語候補を検索

### 主要な状態変数

```typescript
// 自分のポケモン関連
const [selectedConfig, setSelectedConfig] = useState<string>("") // 選択中のプリセット名
const [currentConfig, setCurrentConfig] = useState<UserPokemonConfig>() // 現在の設定
const [isEditingOwn, setIsEditingOwn] = useState<boolean>(false) // 編集モード

// 相手ポケモン関連
const [boxesState, setBoxesState] = useState<BoxesState>() // 全ボックス状態
const [opponentConfig, setOpponentConfig] = useState<MetaPokemonVariant>() // 個別編集中の相手

// フィールド・設定
const [globalField, setGlobalField] = useState<GlobalFieldState>() // フィールド状態
const [calcSettings, setCalcSettings] = useState<CalculationSettings>() // 計算設定

// 結果
const [results, setResults] = useState<CalculationResults | null>(null) // 計算結果
const [activeTab, setActiveTab] = useState<"attack"|"defense"|"defLine"|"offLine">("attack")

// UI状態
const [isPending, startTransition] = useTransition() // 計算中フラグ
const [showImportModal, setShowImportModal] = useState(false)
const [showExportModal, setShowExportModal] = useState(false)
const [showRenameModal, setShowRenameModal] = useState(false)
const [showOpponentEditor, setShowOpponentEditor] = useState(false)
```

### UIセクション構成

```
┌─────────────────────────────────────────────┐
│ [ヘッダー] Pokemon ダメージ計算ツール           │
├─────────────────┬───────────────────────────┤
│ 自分のポケモン   │  フィールド設定              │
│ ・プリセット選択 │  ・天候                      │
│ ・種族名        │  ・フィールド                 │
│ ・特性          │  ・リフレクター/ひかりのかべ   │
│ ・持ち物        │  ・テラスタ状態               │
│ ・性格          ├───────────────────────────┤
│ ・テラスタ      │  計算設定                    │
│ ・努力値スライダ │  ・特性バリアントフィルター     │
│ ・技（4つ）     │  ・テラバリアントフィルター     │
├─────────────────┴───────────────────────────┤
│ 対戦相手ボックス                               │
│ [ボックスタブ: 伝説レギュ上位 | カスタム1 | ...]│
│ [インポート] [エクスポート] [新規作成] [削除]   │
│ ┌─────────────────────────────────────────┐ │
│ │ポケモン一覧（チェックボックスで除外可能）   │ │
│ └─────────────────────────────────────────┘ │
│ [計算実行ボタン]                               │
├─────────────────────────────────────────────┤
│ 結果タブ                                      │
│ [攻撃] [防御] [防御ライン] [攻撃ライン]        │
│ ┌─────────────────────────────────────────┐ │
│ │ 結果テーブル（ページネーション付き）        │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## 10. 状態管理

### React State (ローカル)

UIの状態はすべてReact hooksで管理。`useTransition`を使って計算中のUIブロックを防ぐ。

### localStorage (永続化)

ボックス状態だけlocalStorageに永続化する。

```
キー: 'pokemon-damage-calc-boxes'
値: {
  version: 1,
  state: BoxesState,
  savedAt: number (Unix timestamp)
}
```

### サーバー → クライアント (初期データ)

```
page.tsx (Server)
  ↓ props
DamageCalculator (Client)
  - configs: string[]   プリセット一覧
  - moves: string[]     全技リスト
```

その他のデータ（ポケモン名リスト・翻訳データ等）は`useEffect`内でサーバーアクションを呼び出して取得。

---

## 11. 機能詳細

### 自分のポケモン設定

1. **プリセット選択**: ドロップダウンでJSONファイルを選択し、`loadConfig`でロード
2. **種族名入力**: オートコンプリートで全国図鑑から検索（日英両対応）
3. **特性入力**: オートコンプリート。入力すると`ability_branches.ts`で展開バリアントを確認
4. **努力値**: スライダー（0-252, 4刻み）+ 直接入力（両方から変更可能）
5. **技**: 各スロットに`getLearnset`から取得した習得技でオートコンプリート
6. **テラスタイプ**: 全タイプから選択（Stellar含む）

**注意**: EVスライダーと直接入力の競合を防ぐため、直接入力はローカルstateを持ち、`onBlur`でバリデーション後にメインstateに反映する。

### ボックス管理

| 操作 | 説明 |
|------|------|
| ボックス切り替え | タブクリックでアクティブボックスを変更 |
| 新規作成 | 名前を入力して新しいカスタムボックスを作成 |
| 名前変更 | モーダルで現在のボックス名を変更 |
| 削除 | 確認後にカスタムボックスを削除（デフォルトは削除不可） |
| コピー | 現在のボックスを複製 |
| インポート | PokePaste形式またはJSON形式でポケモンを追加 |
| エクスポート | 現在のボックスをPokePaste形式でテキスト出力 |
| 除外 | チェックボックスで特定のポケモンを計算から除外 |
| 個別編集 | 相手ポケモンの設定を細かく変更 |

**デフォルトボックス "伝説レギュ上位"**:
- IDは常に`'default'`で固定
- 削除不可
- アプリ起動時に最新メタリストで自動更新

### 計算実行

「計算」ボタンクリック → `calculateCustom`サーバーアクション呼び出し

内部処理:
1. アクティブボックスの相手リストから除外済みポケモンを取り除く
2. `VariantFilterMode`で特性/テラバリアントをフィルタリング
3. 各相手に対して攻撃・防御ダメージを計算
4. 防御ライン・攻撃ラインを探索
5. 結果を4タブ分のデータとして整形

### 結果タブ

#### 攻撃タブ

自分のポケモンが各相手に与えるダメージを表示。

| カラム | 説明 |
|--------|------|
| 相手 | 対戦相手のポケモン名（アイコン付き） |
| 技 | 使用技名 |
| ダメージ | 最小〜最大%（例: "60.5% ~ 71.3%"） |
| 確定数 | "確定1発", "乱数1発(87.5%)", "確定2発"など |

行をクリックすると`RowDetailPopup`で詳細パラメータを確認できる。

#### 防御タブ

各相手から受けるダメージを表示。攻撃タブと同様の構成。

#### 防御ラインタブ

「○発耐えるために必要な最小EV」を表示。

| カラム | 説明 |
|--------|------|
| 相手 | 攻撃してくる相手 |
| 技 | 相手の使用技 |
| 閾値 | "2発耐え", "確定耐え"など |
| HP EV | 必要なHP努力値 |
| 防御/特防 EV | 必要な防御側努力値 |

#### 攻撃ラインタブ

「○発で倒すために必要な最小EV」を表示。

| カラム | 説明 |
|--------|------|
| 相手 | ターゲット |
| 技 | 使用技 |
| 目標 | "確定1発", "高乱数1発"など |
| 攻撃 EV | 必要な攻撃努力値 |
| 性格 | 推奨する性格補正 |

### フィールド設定

| 設定 | 選択肢 |
|------|--------|
| 天候 | なし / 日照り / 雨 / 砂嵐 / 雪 |
| フィールド | なし / エレキフィールド / グラスフィールド / サイコフィールド / ミストフィールド |
| 自分側スクリーン | リフレクター / ひかりのかべ / オーロラベール |
| 相手側スクリーン | リフレクター / ひかりのかべ / オーロラベール |
| その他 | マジックルーム / じゅうりょく |

**forcedField**: 一部のメタポケモンは`forcedField`を持ち、そのポケモンとの対戦時に自動でフィールドが上書きされる（例: エルフーンはテールウィンドが展開される想定）。

### 計算設定

#### 特性バリアントフィルター
- **全て表示**: Active/Inactive両方のバリアントを計算
- **Active のみ**: 天候/フィールドが発動しているバリアントのみ
- **Inactive のみ**: 発動していないバリアントのみ

#### テラバリアントフィルター
同様にテラスタル前後のバリアントをフィルタリング。

#### 弱い技を除外
ダメージが低い技を結果から非表示にする。

#### メモを表示
`remarks`フィールドに記載されたメモを表示/非表示。

#### 防御ラインモード
- **HP優先**: HP努力値を最大まで積んだ後、防御/特防を積む
- **効率重視**: HP:防御の比率を考慮して効率的なEV配分を計算

---

## 12. データフロー

```
初期化フェーズ
────────────────────────────────────────────────────────
page.tsx
  ├─ getAvailableConfigs()   ─→ プリセット名リスト
  └─ getAllMoves()            ─→ 全技リスト
       └─→ DamageCalculator propsとして渡す

DamageCalculator マウント時
  ├─ getMetaOpponents()      ─→ メタポケモンリスト
  ├─ getAllSpecies()          ─→ 全ポケモン名リスト
  ├─ getTranslationData()    ─→ 翻訳辞書
  └─ loadBoxes()             ─→ localStorage からボックス読み込み

計算フェーズ
────────────────────────────────────────────────────────
ユーザー操作
  └─→ [計算ボタン] クリック
       └─→ calculateCustom(userConfig, globalField, activeOpponents, settings)
            └─→ logic.ts: calculateDamageForConfig()
                 ├─→ filterVariantsByMode(opponents, mode)
                 ├─→ DamageCalculator.calculateDamage() × N回
                 ├─→ LineExplorer.findOffensiveLine() × N回
                 ├─→ LineExplorer.findDefensiveLine() × N回
                 ├─→ deduplicateResults()
                 └─→ 結果オブジェクト返却
                      └─→ setResults(results)
                           └─→ タブに結果表示

保存フェーズ
────────────────────────────────────────────────────────
boxesState 変更時
  └─→ useEffect
       └─→ saveBoxes(boxesState) → localStorage
```

---

## 13. localStorage設計

```typescript
// キー
const STORAGE_KEY = 'pokemon-damage-calc-boxes'

// 保存形式
interface StorageData {
  version: 1
  state: BoxesState
  savedAt: number  // Date.now()
}

// BoxesState
interface BoxesState {
  boxes: PokemonBox[]
  activeBoxId: string
}
```

### マイグレーション

現在は`version: 1`のみ。将来的にデータ形式が変わった場合、`version`フィールドで旧バージョンのデータを変換できる設計になっている。

### 容量制限への対処

`saveBoxes`は`localStorage.setItem`が失敗した場合（容量オーバー等）を`try-catch`でキャッチし、ユーザーに日本語でアラートを表示する。

---

## 14. 翻訳システム

### 翻訳ソース

- `pokedex_multilang.json`: ポケモン名
- `moves_multilang.json`: 技名
- `abilities_multilang.json`: 特性名

全て `{ "英語名": { "ja": "日本語名" } }` 形式。

### 翻訳の流れ

1. アプリ起動時に`getTranslationData()`で全翻訳辞書を取得
2. `registerTranslations(dict)`でtranslator.tsに登録
3. UI表示時に`t(englishName)`で日本語に変換
4. ユーザー入力時に`toEnglish(text)`で英語に変換してから処理

### 地域フォーム対応

"Incineroar-Alola" のような地域フォームは翻訳辞書のフィルタリング対象。`toEnglish()`で地域サフィックス（"-Alola", "-Galar"等）を保持しながら翻訳する。

### 性別記号対応

`"Incineroar (F)"` のような性別付き名前は、括弧の中をパースして別々に処理する。

---

## 15. 既知のルールと注意点

### MetaPokemonVariantの必須フィールド

型定義（`types.ts`）では省略可能だが、計算コードは以下を必ず期待する:

```typescript
// 必ずこれらを付ける
opponent.level = 50
opponent.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
opponent.ranks = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
```

これが欠けると`@smogon/calc`が`NaN`を返すか例外を投げる。

### アイコン表示の問題

ポケモンアイコンの読み込みに失敗した後、同じ`species`を使い回すとエラー状態のDOMが残る。

解決策: アイコンコンポーネントに `key={species}` を付けて、種族名が変わった際に新しいDOMを生成する。

### EV入力の競合

スライダーと直接入力が同じstateを共有すると、スライダー操作中に入力フォームが書き換えられる問題が発生する。

解決策: 直接入力フィールドはローカルstateを持ち、`onBlur`（フォーカスアウト）時にバリデーション後、メインのEV stateを更新する。

### Stellarテラスタイプの扱い

Stellarは「攻撃時は全タイプへのボーナス、防御時は元のタイプを維持」という仕様。

実装: `toCalcPokemon(config, isAttacker, ...)` の`isAttacker`フラグで処理を分岐し、防御者としてロードする時はStellarを無視して元のタイプを使う。

### 固定多段ヒット技

`Triple Axel`（トリプルアクセル）、`Population Bomb`（テラバースト）等は常に最大ヒット数を使う。`Bullet Seed`（タネマシンガン）等の可変多段ヒット技は`multiHitCount`設定に従う。

### ダブルバトルのスプレッドダメージ

ダブルバトルの複数対象技は0.75倍になる。`settings.spreadDamage`フラグでシングル（1.0倍）/ダブル（0.75倍）を切り替え可能。

---

*このドキュメントはアプリのソースコードを完全に解析して生成したものです。*
*最終更新: 2026-02-18*
