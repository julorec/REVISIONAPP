# 🎓 Coach Partiels — Application de Révision Interactive

![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa)
![React](https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react)
![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=flat-square&logo=supabase)

**Coach Partiels** est une application web progressive (PWA) gratuite, rapide et interactive conçue pour préparer des examens en informatique, électronique, mathématiques et sciences de l'ingénieur.

Elle regroupe **8 matières**, des simulateurs dédiés à chaque discipline, des sujets d'entraînement corrigés et des fonctionnalités communautaires en temps réel (profils, classement et espace d'entraide).

---

## ✨ Fonctionnalités clés

- **Accessible hors-ligne (PWA)** : installable sur mobile ou ordinateur comme une application native.
- **Outils interactifs sur mesure** : éditeurs de circuits, simulateur RISC-V, tracé de Bode, matrices pas à pas…
- **Mode Entraînement & Examens Blancs** : révision par thème, fiches mémo et simulations en conditions d'examen.
- **Espace communautaire temps réel** : suivi de progression, classement et discussion (propulsé par Supabase).

---

## 📚 Les 8 matières couvertes

| Matière | Outils interactifs & Contenu |
| :--- | :--- |
| **1. Langage C** | Coloration syntaxique, 160+ questions, révision par thème, aide-mémoire et examens blancs. |
| **2. Mathématiques** | Matrices interactives, diagonalisation, résolveur **Gauss-Jordan** pas à pas, sujets d'entraînement. |
| **3. Électronique numérique** | Éditeurs SVG (**Machine d'états Moore/Mealy**, **Logigramme**, **Chronogramme**), tables de Karnaugh et sujets PDF intégrés. |
| **4. Programmation système** | **Simulateur assembleur RISC-V 32-bit**, évaluateur **Shell / Makefile / Glob** et examens blancs. |
| **5. Traitement du signal** | Visualiseur **Signaux, Spectres & Repliement (Shannon-Nyquist)**, sujets corrigés et examens blancs. |
| **6. Électronique analogique** | Schémas SVG interactifs (RC, RLC, AOP), éditeur de **diagramme de Bode asymptotique** et examens blancs. |
| **7. Architecture processeurs** | Grille de **Pipeline RISC-V 5 étages** (IF/ID/EX/MEM/WB/STALL) avec/sans forwarding, décodage Cache & RISC-V. |
| **8. Anglais** | Ateliers **Frenglish (Spot & Fix)** et **TOEIC Part 5/6 Cloze** (200+ termes) et tests blancs. |

---

## 🛠️ Stack technique

- **Frontend** : React + TypeScript + Vite (build 100 % statique dans `dist/`).
- **Contenus pédagogiques** : fichiers statiques locaux servis côté client.
- **Backend & Temps réel** : Supabase (authentification, base de données temps réel et stockage).
- **CI/CD** : vérifications automatiques (lint, tests) et déploiement continu.

---

## 🚀 Installation & Développement local

### Prérequis
- [Node.js](https://nodejs.org/) (version 18 ou supérieure recommandée)
- Un projet [Supabase](https://supabase.com/) (offre gratuite suffisante) pour activer les fonctions temps réel.

### Étapes

1. **Cloner le dépôt**
   ```bash
   git clone <url-du-depot>
   cd <nom-du-dossier>
