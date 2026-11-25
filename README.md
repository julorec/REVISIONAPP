# Coach Partiels — INSA Rennes ESET 3A

Application PWA de révision fidèle à l'artefact *Coach Partiels*, enrichie avec l'ensemble des **8 matières ESET 3A** générées depuis Moodle INSA Rennes, des **interfaces interactives adaptées à chaque matière**, la synchronisation **Supabase** (profils, classement promo, discussion temps réel, documents & modules dynamiques) et l'**ingestion intelligente de nouveaux documents via Gemini 4 (`gemini-4-hydrogen`)**.

- Projet Google AI Studio : https://aistudio.google.com/apps/dc6df779-5cad-4d46-838e-692be82790b5

## Les 8 matières & interfaces adaptées
1. **Langage C** : coloration syntaxique, 161+ questions, simulation DS, par thème, aide-mémoire.
2. **Maths** : matrices interactives, diagonalisation, stepper **Gauss-Jordan** pas à pas, annale & 6 DS blancs.
3. **ELEN numérique** : éditeurs SVG **Machine d'états (Moore/Mealy)**, **Logigramme**, **Chronogramme**, tables de Karnaugh, 3 annales PDF + visionneuse.
4. **Prog syst** : **simulateur assembleur RISC-V 32-bit**, évaluateur **Shell / Makefile / Glob**, annale & 6 DS blancs.
5. **Traitement du signal (TTSD)** : visualiseur interactif **Signaux, Spectres & Repliement Shannon-Nyquist**, 2 annales officielles Moodle PDF + corrigés interactifs, 3 DS blancs.
6. **Électronique analogique** : schémas SVG de circuits (RC, RLC, AOP) + éditeur interactif de **diagramme de Bode asymptotique**, 3 DS blancs.
7. **Architecture des processeurs** : grille interactive de **Pipeline RISC-V 5 étages (IF/ID/EX/MEM/WB/STALL)** avec/sans forwarding, décodage Cache & RISC-V, 3 DS blancs.
8. **Anglais S5** : ateliers interactifs **Frenglish (Spot & Fix)** et **TOEIC Part 5/6 Cloze** couvrant les 10 thèmes officiels (223 termes), 2 tests blancs.

## Ajouter de nouveaux documents (sans JSON !)
- **Dans l'application (Admin · PIN `3500`)** : glisse-dépose n'importe quel PDF, DOCX, ODT, XLSX, PPTX, TXT ou photo de sujet. Gemini identifie automatiquement la matière, sélectionne les interfaces adaptées et crée/enrichit les entraînements & fiches mémo dans Supabase (`coach_documents` / `coach_modules`) en direct pour toute la promo.
- **En local (CLI)** :
  ```bash
  python scripts/ingest_document.py chemin/vers/cours_ou_td.pdf
  ```

## Lancer en local
```bash
npm install
# Configure GEMINI_API_KEY dans .env.local
npm run dev
```
