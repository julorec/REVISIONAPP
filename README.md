# 🎓 Coach Partiels

![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa)
![React](https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react)
![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=flat-square&logo=supabase)
![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Pages-222?style=flat-square&logo=github)

**Coach Partiels** est une application web progressive (PWA) gratuite, rapide et interactive conçue pour préparer les partiels et DS de **3e année ESET à l'INSA Rennes**.

Elle regroupe **8 matières**, des simulateurs dédiés à chaque discipline, des annales corrigées et des fonctionnalités communautaires en temps réel (classement de promo, suivi de progression et espace d'entraide).

👉 **Accéder directement à l'application :** [julorec.github.io/REVISIONAPP](https://julorec.github.io/REVISIONAPP/)

---

## ✨ Fonctionnalités clés

- **100 % accessible hors-ligne (PWA)** : installable sur téléphone ou ordinateur comme une application native.
- **Outils interactifs sur mesure** : éditeurs de circuits, simulateur RISC-V, tracé de Bode, matrices pas à pas…
- **Mode Entraînement & DS Blancs** : révision par thème, fiches mémo et simulations en conditions d'examen.
- **Espace Promo temps réel** : profil étudiant, classement collaboratif et discussion entre étudiants (propulsé par Supabase).

---

## 📚 Les 8 matières couvertes

| Matière | Outils interactifs & Contenu |
| :--- | :--- |
| **1. Langage C** | Coloration syntaxique, 161+ questions, révision par thème, aide-mémoire et simulations de DS. |
| **2. Mathématiques** | Matrices interactives, diagonalisation, résolveur **Gauss-Jordan** pas à pas, annales et 6 DS blancs. |
| **3. Électronique numérique** | Éditeurs SVG (**Machine d'états Moore/Mealy**, **Logigramme**, **Chronogramme**), tables de Karnaugh, 3 annales PDF intégrées. |
| **4. Programmation système** | **Simulateur assembleur RISC-V 32-bit**, évaluateur **Shell / Makefile / Glob**, annales et 6 DS blancs. |
| **5. Traitement du signal (TTSD)** | Visualiseur **Signaux, Spectres & Repliement (Shannon-Nyquist)**, 2 annales PDF + corrigés interactifs, 3 DS blancs. |
| **6. Électronique analogique** | Schémas SVG interactifs (RC, RLC, AOP), éditeur de **diagramme de Bode asymptotique**, 3 DS blancs. |
| **7. Architecture processeurs** | Grille de **Pipeline RISC-V 5 étages** (IF/ID/EX/MEM/WB/STALL) avec/sans forwarding, décodage Cache & RISC-V, 3 DS blancs. |
| **8. Anglais S5** | Ateliers **Frenglish (Spot & Fix)** et **TOEIC Part 5/6 Cloze** sur les 10 thèmes officiels (223 termes), 2 tests blancs. |

---

## 🛠️ Stack technique

- **Frontend** : React + TypeScript + Vite (build 100 % statique dans `dist/`).
- **Données pédagogiques** : fichiers statiques servis depuis `public/coach-data/`.
- **Backend & Temps réel** : Supabase (authentification/profils, base de données temps réel et stockage média).
- **CI/CD** : GitHub Actions pour les vérifications (lint, tests) et le déploiement continu.

---

## 🚀 Installation & Développement local

### Prérequis
- [Node.js](https://nodejs.org/) (version 18 ou supérieure recommandée)
- Un projet [Supabase](https://supabase.com/) (offre gratuite suffisante) si tu souhaites tester la synchronisation temps réel.

### Étapes

1. **Cloner le dépôt**
   ```bash
   git clone [https://github.com/julorec/REVISIONAPP.git](https://github.com/julorec/REVISIONAPP.git)
   cd REVISIONAPP
