# Coach Partiels — INSA Rennes ESET 3A

Application PWA **100 % statique + Supabase** (aucun serveur Node, aucune clé API Gemini, **0 €**) reproduisant fidèlement l'artefact *Coach Partiels* avec les **8 matières ESET 3A** générées depuis Moodle INSA Rennes, des interfaces interactives adaptées à chaque matière, et la synchronisation temps réel **Supabase** (profils, classement promo, discussion et bannière).

## Architecture ultra-simple
- **Frontend statique (`dist/`)** : React + Vite + PWA + fichiers pédagogiques dans `public/coach-data/`. Hébergeable gratuitement sur **Vercel**, **Netlify**, **Cloudflare Pages** ou **GitHub Pages** directement depuis `julorec/REVISIONAPP`.
- **Supabase (gratuit)** : profils (`coach_profiles`), classement temps réel (`coach_board`), discussion promo (`coach_chat`), bannière (`app_settings` + Storage `app-media`). Le schéma `supabase/schema.sql` est synchronisé automatiquement par `.github/workflows/supabase-sync.yml`.
- **Mise à jour des cours (0 clé API)** : pour ajouter un nouveau cours, TD ou annale Moodle, génère les nouveaux exercices/mémos dans **Antigravity** (qui met à jour `public/coach-data/`), puis pousse sur GitHub → le site statique se redéploie automatiquement.

## Les 8 matières & interfaces adaptées
1. **Langage C** : coloration syntaxique, 161+ questions, simulation DS, par thème, aide-mémoire.
2. **Maths** : matrices interactives, diagonalisation, stepper **Gauss-Jordan** pas à pas, annale & 6 DS blancs.
3. **ELEN numérique** : éditeurs SVG **Machine d'états (Moore/Mealy)**, **Logigramme**, **Chronogramme**, tables de Karnaugh, 3 annales PDF + visionneuse.
4. **Prog syst** : **simulateur assembleur RISC-V 32-bit**, évaluateur **Shell / Makefile / Glob**, annale & 6 DS blancs.
5. **Traitement du signal (TTSD)** : visualiseur interactif **Signaux, Spectres & Repliement Shannon-Nyquist**, 2 annales officielles Moodle PDF + corrigés interactifs, 3 DS blancs.
6. **Électronique analogique** : schémas SVG de circuits (RC, RLC, AOP) + éditeur interactif de **diagramme de Bode asymptotique**, 3 DS blancs.
7. **Architecture des processeurs** : grille interactive de **Pipeline RISC-V 5 étages (IF/ID/EX/MEM/WB/STALL)** avec/sans forwarding, décodage Cache & RISC-V, 3 DS blancs.
8. **Anglais S5** : ateliers interactifs **Frenglish (Spot & Fix)** et **TOEIC Part 5/6 Cloze** couvrant les 10 thèmes officiels (223 termes), 2 tests blancs.

## Développement local & déploiement statique
```bash
npm install
npm run dev       # Serveur local http://localhost:3000
npm run lint      # Vérification TypeScript
npm test          # Tests unitaires
npm run build     # Génère le dossier statique dist/ prêt à héberger partout
```

### Déploiement automatique GitHub Pages (déjà configuré)
- Chaque `push` sur `main` déclenche [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) (`npm run lint`, `npm test`, `VITE_BASE_PATH=/REVISIONAPP/ npm run build`) et publie automatiquement la PWA sur **`https://julorec.github.io/REVISIONAPP/`**.
- **Variables d'environnement requises** : *aucune* (les identifiants publics Supabase par défaut sont déjà configurés, surchargeables via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).
- Compatible aussi tel quel sur **Vercel**, **Netlify** ou **Cloudflare Pages** (`npm run build` → `dist/`).
