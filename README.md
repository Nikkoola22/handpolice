# 🖋️ CalliFont Studio - Handwriting & Cursive Font Maker

Application web complète inspirée de [Calligraphr](https://www.calligraphr.com/fr/features/) permettant de transformer votre écriture manuscrite ou cursive en véritable police typographique TrueType (`.ttf`), utilisable dans n'importe quel logiciel (Word, Photoshop, Illustrator, système macOS/Windows).

---

## ✨ Fonctionnalités Principales

### 1. ✍️ Atelier de Dessin & Retouche de Glyphes
- Tracé vectoriel fluide au stylet ou à la souris avec choix de calibres de plume et gomme.
- **Guides typographiques complets** : Ligne de base (Baseline), Hauteur d'x, Ligne d'ascendante et descendante.
- **Gestion des variantes (Alternance aléatoire)** : Dessinez jusqu'à 4 variantes pour chaque lettre afin que deux "e" consécutifs ne soient jamais identiques.
- Réglage en direct des marges d'approche latérale (*Left & Right sidebearings*) et du décalage vertical.

### 2. 🔗 Conçu pour l'Écriture Cursive Connectée
- **Guides de liaison standardisés** : Points d'ancrage visuels *« Entrée »* (vert) et *« Sortie »* (rose) à la même hauteur.
- **Voisins fantômes en direct (Ghost Preview)** : Visualisation en filigrane des lettres adjacentes pendant le tracé pour s'assurer que les raccords s'emboîtent sans couture.
- **Calibrage cursif en 1 clic** : Réglage automatique des marges à 0 / recouvrement négatif (-8px).
- **Pack Cursif Français** : 24 paires délicates à attache haute (*on*, *ou*, *oi*, *br*, *bl*, *ve*, *vi*...) et doubles lettres fréquentes (*ll*, *tt*, *ch*, *qu*...).

### 3. 🌊 Simulateur Réaliste & Ligne Non Horizontale
- **Dérive naturelle de phrase** : Réglage de la pente d'écriture (-5° à +5°) pour simuler une phrase qui monte ou qui descend le long de la page.
- **Ondulation organique de la ligne de base** : Flottement naturel des mots au fil du texte.
- **Micro-inclinaison du poignet** : Rotation subtile individuelle de chaque lettre.
- **Curseur de recouvrement cursif** : Ajustement continu de l'espacement entre -20px et +15px.
- **Fonds de papier et encres** : Papier Seyès écolier, ligné, parchemin, blanc pur ; encres bleue plume, feutre noir, violette, graphite.

### 4. 📄 Gabarits A4 Imprimables & Scanner Photo
- Génération de gabarits A4 au format PDF et PNG avec repères de calage aux quatre coins.
- Scanner d'importation automatique : prise en charge des photos ou scans de feuilles de gabarit remplies au feutre.

### 5. 📦 Export TrueType (.ttf) Instantané
- Compilation OpenType/TrueType 100% côté client via `opentype.js`.
- Injection en direct de la police dans le navigateur pour prévisualisation immédiate (`FontFace API`).
- Téléchargement du fichier `.ttf` prêt à être installé dans le Livre des polices macOS ou Windows.

---

## 🚀 Démarrage Rapide

```bash
# Installation des dépendances
npm install

# Démarrage du serveur de développement
npm run dev

# Construction pour la production
npm run build
```

---

## 🛠️ Stack Technique

- **Framework** : React 18, TypeScript, Vite
- **Styles** : Tailwind CSS, Lucide Icons
- **Typographie & Géométrie** : `opentype.js`, Vectorizer Bounding-Box Contours
- **Génération Document** : `jspdf`, HTML5 Canvas
