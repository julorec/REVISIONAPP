import type { QuizRow } from '../types/quiz';

/**
 * Curated INSA Rennes ESET 3A seed quiz bank.
 * Used seamlessly as fallback when Supabase table `quizzes` is empty, not yet
 * initialized (PGRST205), or while offline (PWA mode).
 *
 * Showcases all question types:
 * - qcm, vrai_faux, calcul (±5% numeric input & calcul with options), ordre
 * - Multi-language code highlighting: C, VHDL, Assembly (ARM), Python
 * - KaTeX math ($...$ and $$...$$)
 * - Embedded sanitized <svg> schematics
 */
export const SEED_QUIZZES: QuizRow[] = [
  // =========================================================================
  // 1. PROGRAMMATION C (24 questions -> full 20-question Mode Examen Mélangé)
  // =========================================================================
  {
    id: 'seed-c-pointeurs-cours',
    matiere: 'Programmation C',
    chapitre: 'Pointeurs & Mémoire (malloc)',
    type_source: 'Cours',
    origin: 'seed',
    questions: [
      {
        id: 'p1',
        type: 'qcm',
        concept: 'Arithmétique de pointeurs',
        ask: "Qu'affiche ce programme sur une architecture 64 bits où `sizeof(int) == 4` ?",
        code: `#include <stdio.h>

int main(void) {
    int tab[4] = {10, 20, 30, 40};
    int *p = tab + 1;
    printf("%d %d\\n", *(p + 2), p[-1]);
    return 0;
}`,
        lang: 'c',
        opts: ['40 10', '30 20', '40 0', 'Comportement indéfini'],
        ans: 0,
        why: '`p` pointe sur `tab[1]` (20). `*(p + 2)` accède à `tab[3]` (40) et `p[-1]` vaut `*(p - 1)` soit `tab[0]` (10), ce qui est parfaitement défini en C.',
      },
      {
        id: 'p2',
        type: 'qcm',
        concept: 'Allocation dynamique (malloc)',
        ask: "Quel est le défaut majeur de cette fonction d'allocation ?",
        code: `#include <stdlib.h>

int *creer_tab(size_t n) {
    int *t = malloc(n);
    if (!t) return NULL;
    for (size_t i = 0; i < n; i++) {
        t[i] = 0;
    }
    return t;
}`,
        lang: 'c',
        opts: [
          "Il manque le facteur `sizeof(int)` dans `malloc(n * sizeof(int))`",
          "Il faut absolument caster le retour de `malloc` en `(int *)`",
          "On ne peut pas retourner un pointeur alloué sur le tas",
          "`t[i]` est interdit sur un pointeur dynamique",
        ],
        ans: 0,
        why: "`malloc(n)` n'alloue que $n$ octets au lieu de $n \\times \\text{sizeof(int)}$ octets : la boucle écrit hors zone allouée (heap buffer overflow). En C, le cast de `void *` n'est pas nécessaire.",
      },
      {
        id: 'p3',
        type: 'vrai_faux',
        concept: 'Libération mémoire',
        ask: 'En C standard, appeler `free(NULL)` déclenche une erreur de segmentation (segfault).',
        opts: ['Vrai', 'Faux'],
        ans: 1,
        why: "Faux : la norme ISO C garantit que `free(NULL)` ne fait aucune opération. C'est pourquoi remettre un pointeur à `NULL` après `free(p)` protège contre les doubles libérations.",
      },
      {
        id: 'p4',
        type: 'calcul',
        concept: 'Tas vs Pile · Taille allouée',
        ask: "On exécute l'allocation ci-dessous sur une cible 32 bits (`sizeof(int) = 4`, `sizeof(double) = 8`). Quelle taille totale (en octets) est réservée sur le tas ?",
        code: `double *buf = calloc(16, sizeof(double));`,
        lang: 'c',
        svg: `<svg viewBox="0 0 360 110" class="w-full max-w-md mx-auto">
  <rect x="12" y="14" width="130" height="82" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="77" y="34" text-anchor="middle" font-size="12" font-family="IBM Plex Mono, monospace" fill="currentColor">Pile (Stack)</text>
  <rect x="26" y="46" width="102" height="34" rx="4" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
  <text x="77" y="67" text-anchor="middle" font-size="12" font-family="IBM Plex Mono, monospace" fill="currentColor">double *buf</text>
  <line x1="128" y1="63" x2="206" y2="63" stroke="var(--accent)" stroke-width="2"/>
  <polygon points="206,58 216,63 206,68" fill="var(--accent)"/>
  <rect x="218" y="14" width="130" height="82" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="283" y="34" text-anchor="middle" font-size="12" font-family="IBM Plex Mono, monospace" fill="currentColor">Tas (Heap)</text>
  <rect x="230" y="46" width="106" height="34" rx="4" fill="var(--warm-soft)" stroke="var(--warm)" stroke-width="1.5"/>
  <text x="283" y="67" text-anchor="middle" font-size="11.5" font-family="IBM Plex Mono, monospace" fill="currentColor">16 × double (0)</text>
</svg>`,
        reponse_numerique: 128,
        unite: 'octets',
        tolerance: 0.05,
        why: '`calloc(16, sizeof(double))` alloue $16 \\times 8 = 128$ octets contigus sur le tas et les initialise tous à zéro.',
      },
    ],
  },
  {
    id: 'seed-c-pointeurs-annales',
    matiere: 'Programmation C',
    chapitre: 'Pointeurs & Mémoire (malloc)',
    type_source: 'Annales',
    origin: 'seed',
    questions: [
      {
        id: 'pa1',
        type: 'qcm',
        concept: 'Passage par adresse',
        ask: "Qu'affiche ce code issu d'un partiel ESET 3A ?",
        code: `#include <stdio.h>

void f(int *a, int b) {
    *a += b;
    b = 99;
}

int main(void) {
    int x = 5, y = 7;
    f(&x, y);
    printf("%d %d\\n", x, y);
    return 0;
}`,
        lang: 'c',
        opts: ['12 7', '12 99', '5 7', '5 99'],
        ans: 0,
        why: '`x` est passé par adresse (`&x`), donc `*a += b` modifie `x` en $5 + 7 = 12$. `y` est passé par valeur : modifier la copie locale `b` ne change pas `y` (7).',
      },
      {
        id: 'pa2',
        type: 'qcm',
        concept: 'Double pointeur & realloc',
        ask: 'Pourquoi écrit-on `int *tmp = realloc(p, new_size);` au lieu de `p = realloc(p, new_size);` ?',
        code: `int *tmp = realloc(p, n * sizeof(int));
if (tmp != NULL) {
    p = tmp;
}`,
        lang: 'c',
        opts: [
          "Si `realloc` échoue et retourne `NULL`, on perd l'adresse originale de `p` (fuite mémoire)",
          '`realloc` ne peut jamais retourner la même adresse que `p`',
          '`p = realloc(p, ...)` ne compile pas en C99',
          '`realloc` libère automatiquement `p` en cas d’échec',
        ],
        ans: 0,
        why: "Si `realloc` échoue, le bloc original reste alloué mais le retour vaut `NULL`. Écraser directement `p` fait perdre le seul pointeur vers l'ancien bloc.",
      },
      {
        id: 'pa3',
        type: 'qcm',
        concept: 'Pointeur de fonction',
        ask: 'Quelle déclaration définit un pointeur `op` vers une fonction prenant deux `int` et retournant un `int` ?',
        opts: [
          'int (*op)(int, int);',
          'int *op(int, int);',
          'int (*op[2])(int);',
          'void (*op)(int, int);',
        ],
        ans: 0,
        why: 'Les parenthèses autour de `(*op)` sont indispensables : sans elles, `int *op(int, int)` déclare une fonction retournant un `int *`.',
      },
    ],
  },
  {
    id: 'seed-c-bitwise-cours',
    matiere: 'Programmation C',
    chapitre: 'Opérations Bitwise & Masques',
    type_source: 'Cours',
    origin: 'seed',
    questions: [
      {
        id: 'b1',
        type: 'qcm',
        concept: 'Mise à 1 / mise à 0 de bit',
        ask: 'Quelle instruction met le bit $n$ (indexé à partir de 0) du registre `reg` à **0** sans modifier les autres bits ?',
        code: `uint8_t reg = 0xFF;`,
        lang: 'c',
        opts: [
          'reg &= ~(1U << n);',
          'reg |= ~(1U << n);',
          'reg ^= (1U << n);',
          'reg &= (1U << n);',
        ],
        ans: 0,
        why: '`1U << n` place un 1 au rang $n$. Son complément bit à bit `~(1U << n)` a un 0 uniquement au rang $n$ et des 1 partout ailleurs. Le ET bit à bit (`&=`) force donc ce bit à 0.',
      },
      {
        id: 'b2',
        type: 'calcul',
        concept: 'Extraction de champ de bits',
        ask: 'Quelle valeur décimale contient `val` après exécution de ce code ?',
        code: `uint8_t reg = 0xB6; // 1011 0110 en binaire
uint8_t val = (reg >> 2) & 0x0F;`,
        lang: 'c',
        reponse_numerique: 13,
        unite: '(base 10)',
        tolerance: 0.05,
        why: '`0xB6` = `1011_0110`. Décalé de 2 bits à droite : `0010_1101`. Masqué par `0x0F` (`0000_1111`) : `0000_1101` = $8 + 4 + 1 = 13$ (`0x0D`).',
      },
      {
        id: 'b3',
        type: 'qcm',
        concept: 'XOR & inversion de bit',
        ask: "Qu'affiche ce programme ?",
        code: `#include <stdio.h>
#include <stdint.h>

int main(void) {
    uint8_t a = 0x0A; // 0000 1010
    a ^= (1U << 1) | (1U << 0);
    printf("0x%02X\\n", a);
    return 0;
}`,
        lang: 'c',
        opts: ['0x09', '0x0B', '0x08', '0x0F'],
        ans: 0,
        why: 'Le masque `(1U << 1) | (1U << 0)` vaut `0x03` (`0000 0011`). Le XOR inverse les deux bits de poids faible : `1010 ^ 0011 = 1001`, soit `0x09`.',
      },
    ],
  },
  {
    id: 'seed-c-bitwise-annales',
    matiere: 'Programmation C',
    chapitre: 'Opérations Bitwise & Masques',
    type_source: 'Annales',
    origin: 'seed',
    questions: [
      {
        id: 'ba1',
        type: 'qcm',
        concept: 'Test de puissance de 2',
        ask: "Pour un entier non signé `n > 0`, que teste l'expression `(n & (n - 1)) == 0` ?",
        opts: [
          'Que `n` est une puissance de 2 exacte',
          'Que `n` est pair',
          'Que `n` a tous ses bits à 1',
          'Que `n` est divisible par 4',
        ],
        ans: 0,
        why: "Soustraire 1 inverse le bit à 1 le plus faible et tous les zéros à sa droite. Si `n` n'a qu'un seul bit à 1 (puissance de 2), `n & (n - 1)` vaut 0.",
      },
      {
        id: 'ba2',
        type: 'qcm',
        concept: 'Priorité des opérateurs',
        ask: 'Quel piège classique contient ce test de flag matériel ?',
        code: `if (status & 0x04 == 0) {
    retry();
}`,
        lang: 'c',
        opts: [
          '`==` est prioritaire sur `&` : le compilateur lit `status & (0x04 == 0)` soit `status & 0`',
          '`&` ne fonctionne pas sur des entiers signés',
          '`0x04` devrait être écrit `4U` sinon il y a erreur de compilation',
          'Aucun piège, `&` est prioritaire sur `==`',
        ],
        ans: 0,
        why: "En C, `==` a une priorité supérieure à `&`. Il faut toujours parenthéser les masques : `if ((status & 0x04) == 0)`.",
      },
      {
        id: 'ba3',
        type: 'vrai_faux',
        concept: 'Décalage à gauche signé',
        ask: 'En C, faire `1 << 31` sur un `int` signé 32 bits est un comportement bien défini qui donne `-2147483648`.',
        opts: ['Vrai', 'Faux'],
        ans: 1,
        why: "Faux : décaler un `1` dans le bit de signe d'un `int` signé est un comportement indéfini (UB) en C. Il faut utiliser un littéral non signé `1U << 31`.",
      },
    ],
  },
  {
    id: 'seed-c-structs-cours',
    matiere: 'Programmation C',
    chapitre: 'Structures & Énumérations',
    type_source: 'Cours',
    origin: 'seed',
    questions: [
      {
        id: 's1',
        type: 'qcm',
        concept: 'Opérateur flèche ->',
        ask: "Qu'affiche ce programme manipulant un pointeur vers une structure ?",
        code: `#include <stdio.h>

typedef struct {
    int x;
    int y;
} Point;

void translater(Point *p, int dx) {
    p->x += dx;
}

int main(void) {
    Point pt = {3, 4};
    translater(&pt, 5);
    printf("%d,%d\\n", pt.x, pt.y);
    return 0;
}`,
        lang: 'c',
        opts: ['8,4', '3,4', '8,9', 'Erreur de compilation'],
        ans: 0,
        why: '`p->x` équivaut à `(*p).x`. La structure `pt` étant passée par adresse, `pt.x` passe de 3 à 8 et `pt.y` reste 4.',
      },
      {
        id: 's2',
        type: 'qcm',
        concept: 'Alignement & padding',
        ask: 'Pourquoi `sizeof(Paquet)` vaut-il généralement **12 octets** et non 6 sur une architecture 32/64 bits ?',
        code: `typedef struct {
    char tag;   // 1 octet
    int  id;    // 4 octets
    char flag;  // 1 octet
} Paquet;`,
        lang: 'c',
        opts: [
          'Le compilateur insère du padding pour aligner `id` sur 4 octets et la structure totale sur un multiple de 4',
          'Un `char` occupe toujours 4 octets dans une structure',
          'Un `typedef struct` ajoute un en-tête de 6 octets',
          'Le compilateur alloue un pointeur caché dans chaque `struct`',
        ],
        ans: 0,
        why: 'Layout mémoire : `tag` (1o) + 3o de padding + `id` (4o) + `flag` (1o) + 3o de padding final = 12 octets. Regrouper `tag` et `flag` ensemble réduit la taille à 8 octets !',
      },
      {
        id: 's3',
        type: 'qcm',
        concept: 'Énumérations (enum)',
        ask: 'Que vaut `ETAT_ERR` dans cette énumération C ?',
        code: `enum Etat {
    ETAT_IDLE = 1,
    ETAT_RUN,
    ETAT_PAUSE = 10,
    ETAT_ERR
};`,
        lang: 'c',
        opts: ['11', '3', '10', '4'],
        ans: 0,
        why: "Chaque constante non initialisée vaut la précédente + 1 : `ETAT_IDLE = 1`, `ETAT_RUN = 2`, `ETAT_PAUSE = 10`, donc `ETAT_ERR = 11`.",
      },
    ],
  },
  {
    id: 'seed-c-structs-annales',
    matiere: 'Programmation C',
    chapitre: 'Structures & Énumérations',
    type_source: 'Annales',
    origin: 'seed',
    questions: [
      {
        id: 'sa1',
        type: 'qcm',
        concept: 'Liste chaînée · Suppression en tête',
        ask: 'Quel bug se cache dans cette fonction censée libérer toute une liste chaînée ?',
        code: `typedef struct Noeud {
    int val;
    struct Noeud *suiv;
} Noeud;

void liberer(Noeud *tete) {
    while (tete != NULL) {
        free(tete);
        tete = tete->suiv;
    }
}`,
        lang: 'c',
        opts: [
          'Use-after-free : on lit `tete->suiv` après avoir appelé `free(tete)`',
          'Fuite mémoire sur le dernier maillon uniquement',
          'Boucle infinie garantie',
          'On ne peut pas modifier le paramètre `tete` dans la fonction',
        ],
        ans: 0,
        why: 'Il faut sauvegarder `Noeud *next = tete->suiv;` **avant** d’appeler `free(tete);`, puis affecter `tete = next;`.',
      },
      {
        id: 'sa2',
        type: 'qcm',
        concept: 'Union en C embarqué',
        ask: "Sur une cible 32 bits, quelle est la taille de cette `union` utilisée pour lire un registre ?",
        code: `typedef union {
    uint32_t raw;
    uint8_t  bytes[4];
} Reg32;`,
        lang: 'c',
        opts: ['4 octets', '8 octets', '5 octets', '16 octets'],
        ans: 0,
        why: "Dans une `union`, tous les champs partagent le même espace mémoire : `sizeof(Reg32)` est la taille du plus grand membre, ici 4 octets.",
      },
    ],
  },
  {
    id: 'seed-c-io-cours',
    matiere: 'Programmation C',
    chapitre: 'Compilation & Chaînes',
    type_source: 'Cours',
    origin: 'seed',
    questions: [
      {
        id: 'io1',
        type: 'ordre',
        concept: 'Chaîne de compilation GCC',
        ask: "Remettez dans l'ordre chronologique les 4 étapes qui transforment un fichier `.c` en exécutable binaire :",
        ordre_correct: [
          'Préprocesseur (`#include`, `#define` → `.i`)',
          'Compilateur (C vers assembleur → `.s`)',
          'Assembleur (assembleur vers code objet → `.o`)',
          'Éditeur de liens (résolution des symboles → exécutable)',
        ],
        why: 'GCC exécute dans l’ordre : prétraitement (`-E`), compilation (`-S`), assemblage (`-c`), puis édition de liens (`ld`).',
      },
      {
        id: 'io2',
        type: 'qcm',
        concept: 'Chaînes C & terminateur nul',
        ask: "Qu'affiche ce programme ?",
        code: `#include <stdio.h>
#include <string.h>

int main(void) {
    char s[] = "ESET";
    printf("%zu %zu\\n", sizeof(s), strlen(s));
    return 0;
}`,
        lang: 'c',
        opts: ['5 4', '4 4', '8 4', '5 5'],
        ans: 0,
        why: '`sizeof(s)` compte les 4 caractères plus le terminateur nul `\\0` (5 octets), alors que `strlen(s)` compte les caractères avant `\\0` (4).',
      },
      {
        id: 'io3',
        type: 'qcm',
        concept: 'Entrée standard (stdin)',
        ask: "Qu'affiche ce programme avec l'entrée standard ci-dessous ?",
        code: `#include <stdio.h>

int main(void) {
    int a = 0, b = 0;
    int r = scanf("%d %d", &a, &b);
    printf("r=%d a=%d b=%d\\n", r, a, b);
    return 0;
}`,
        lang: 'c',
        stdin: '42 abc',
        opts: ['r=1 a=42 b=0', 'r=2 a=42 b=0', 'r=0 a=0 b=0', 'r=-1 a=42 b=0'],
        ans: 0,
        why: '`scanf` convertit correctement `42` dans `a`, échoue sur `abc` (laisse `b` inchangé à 0) et retourne le nombre de conversions réussies : `1`.',
      },
    ],
  },
  {
    id: 'seed-c-io-annales',
    matiere: 'Programmation C',
    chapitre: 'Compilation & Chaînes',
    type_source: 'Annales',
    origin: 'seed',
    questions: [
      {
        id: 'ioa1',
        type: 'qcm',
        concept: 'Comparaison de chaînes',
        ask: 'Que retourne `strcmp("insa", "insa")` ?',
        opts: ['0', '1', '-1', '4'],
        ans: 0,
        why: '`strcmp` retourne `0` quand deux chaînes sont identiques (attention : `if (strcmp(a, b))` est donc faux quand elles sont égales !).',
      },
      {
        id: 'ioa2',
        type: 'qcm',
        concept: 'Macro préprocesseur',
        ask: "Qu'affiche ce programme à cause de la macro non parenthésée ?",
        code: `#include <stdio.h>
#define SQR(x) x * x

int main(void) {
    printf("%d\\n", SQR(2 + 3));
    return 0;
}`,
        lang: 'c',
        opts: ['11', '25', '10', '13'],
        ans: 0,
        why: 'Le préprocesseur fait un remplacement textuel pur : `2 + 3 * 2 + 3 = 2 + 6 + 3 = 11`. Il faut écrire `#define SQR(x) ((x) * (x))`.',
      },
      {
        id: 'ioa3',
        type: 'vrai_faux',
        concept: 'Static en variable locale',
        ask: "Une variable locale déclarée `static` dans une fonction conserve sa valeur d'un appel à l'autre.",
        opts: ['Vrai', 'Faux'],
        ans: 0,
        why: 'Vrai : sa durée de vie est statique (toute la durée du programme), mais sa portée reste locale à la fonction.',
      },
    ],
  },

  // =========================================================================
  // 2. TRAITEMENT DU SIGNAL (KaTeX + Calcul ±5% + SVG + Python + Ordre)
  // =========================================================================
  {
    id: 'seed-ts-fourier-cours',
    matiere: 'Traitement du Signal',
    chapitre: 'Transformée de Fourier & Filtres',
    type_source: 'Cours',
    origin: 'seed',
    questions: [
      {
        id: 'ts1',
        type: 'calcul',
        concept: 'Filtre passe-bas RC · Fréquence de coupure',
        ask: "On considère le filtre passe-bas RC ci-dessous avec $R = 1\\,\\text{k}\\Omega$ et $C = 100\\,\\text{nF}$. Calculez sa fréquence de coupure à $-3\\,\\text{dB}$, sachant que $$f_c = \\frac{1}{2\\pi R C}$$",
        svg: `<svg viewBox="0 0 400 132" class="w-full max-w-md mx-auto">
  <line x1="34" y1="38" x2="104" y2="38" stroke="currentColor" stroke-width="2"/>
  <rect x="104" y="26" width="68" height="24" rx="3" fill="var(--surface-2)" stroke="currentColor" stroke-width="2"/>
  <text x="138" y="18" text-anchor="middle" font-size="12" font-family="IBM Plex Mono, monospace" fill="currentColor">R = 1 kΩ</text>
  <line x1="172" y1="38" x2="346" y2="38" stroke="currentColor" stroke-width="2"/>
  <circle cx="232" cy="38" r="3.5" fill="var(--accent)"/>
  <line x1="232" y1="38" x2="232" y2="62" stroke="currentColor" stroke-width="2"/>
  <line x1="212" y1="62" x2="252" y2="62" stroke="var(--accent)" stroke-width="2.5"/>
  <line x1="212" y1="72" x2="252" y2="72" stroke="var(--accent)" stroke-width="2.5"/>
  <line x1="232" y1="72" x2="232" y2="104" stroke="currentColor" stroke-width="2"/>
  <text x="262" y="72" text-anchor="start" font-size="11.5" font-family="IBM Plex Mono, monospace" fill="currentColor">C = 100 nF</text>
  <line x1="34" y1="104" x2="346" y2="104" stroke="currentColor" stroke-width="2"/>
  <circle cx="34" cy="38" r="3.5" fill="var(--surface)" stroke="currentColor" stroke-width="2"/>
  <circle cx="34" cy="104" r="3.5" fill="var(--surface)" stroke="currentColor" stroke-width="2"/>
  <circle cx="346" cy="38" r="3.5" fill="var(--surface)" stroke="currentColor" stroke-width="2"/>
  <circle cx="346" cy="104" r="3.5" fill="var(--surface)" stroke="currentColor" stroke-width="2"/>
  <text x="18" y="75" text-anchor="middle" font-size="12" font-family="IBM Plex Mono, monospace" fill="var(--dim)">Ve</text>
  <text x="372" y="75" text-anchor="middle" font-size="12" font-weight="600" font-family="IBM Plex Mono, monospace" fill="var(--accent)">Vs</text>
</svg>`,
        reponse_numerique: 1591.5,
        unite: 'Hz',
        tolerance: 0.05,
        why: '$$f_c = \\frac{1}{2\\pi \\times 10^3 \\times 100\\times 10^{-9}} = \\frac{10^4}{2\\pi} \\approx 1591{,}5\\,\\text{Hz}$$ (toute réponse dans $[1512; 1671]\\,\\text{Hz}$ est acceptée à $\\pm 5\\%$).',
      },
      {
        id: 'ts2',
        type: 'qcm',
        concept: 'Porte rectangulaire & sinus cardinal',
        ask: 'Quelle est la transformée de Fourier de la fonction porte $\\Pi_T(t)$ de durée $T$ centrée en 0 ?',
        opts: [
          '$T\\,\\text{sinc}(f T)$',
          '$\\frac{1}{T}\\,\\text{sinc}(f / T)$',
          '$T\\,e^{-j2\\pi f T}$',
          '$\\delta(f - T) + \\delta(f + T)$',
        ],
        ans: 0,
        why: '$$\\mathcal{F}\\{\\Pi_T(t)\\}(f) = \\int_{-T/2}^{T/2} e^{-j2\\pi f t}\\,\\mathrm{d}t = T\\,\\frac{\\sin(\\pi f T)}{\\pi f T} = T\\,\\text{sinc}(fT)$$',
      },
      {
        id: 'ts3',
        type: 'qcm',
        concept: 'Analyse spectrale Python / NumPy',
        ask: 'Avec ce script Python, quelle résolution fréquentielle $\\Delta f$ sépare deux raies consécutives de la FFT ?',
        code: `import numpy as np

fs = 8000       # Fréquence d'échantillonnage (Hz)
N = 1024        # Nombre d'échantillons
t = np.arange(N) / fs
X = np.fft.rfft(np.cos(2 * np.pi * 1000 * t))
freqs = np.fft.rfftfreq(N, d=1/fs)`,
        lang: 'python',
        opts: [
          '$\\Delta f = f_s / N = 7{,}8125\\,\\text{Hz}$',
          '$\\Delta f = N / f_s = 0{,}128\\,\\text{Hz}$',
          '$\\Delta f = f_s / 2 = 4000\\,\\text{Hz}$',
          '$\\Delta f = 1000 / N \\approx 0{,}98\\,\\text{Hz}$',
        ],
        ans: 0,
        why: 'La résolution fréquentielle d’une TFD/FFT sur $N$ points échantillonnés à $f_s$ vaut toujours $\\Delta f = \\frac{f_s}{N} = \\frac{8000}{1024} = 7{,}8125\\,\\text{Hz}$.',
      },
      {
        id: 'ts4',
        type: 'calcul',
        concept: 'Gain en décibels (calcul avec options)',
        ask: 'Un filtre atténue une amplitude par un facteur $0{,}1$ ($|H(f)| = 0{,}1$). Quel est son gain en décibels $G_{\\text{dB}} = 20\\log_{10}|H(f)|$ ?',
        opts: ['$-20\\,\\text{dB}$', '$-10\\,\\text{dB}$', '$-3\\,\\text{dB}$', '$-40\\,\\text{dB}$'],
        ans: 0,
        unite: 'dB',
        why: '$G_{\\text{dB}} = 20\\log_{10}(10^{-1}) = -20\\,\\text{dB}$. Note : lorsque `options` est fourni sur une question de type `calcul`, l’interface bascule en choix multiples.',
      },
    ],
  },
  {
    id: 'seed-ts-echantillonnage-annales',
    matiere: 'Traitement du Signal',
    chapitre: 'Échantillonnage & Transformée en Z',
    type_source: 'Annales',
    origin: 'seed',
    questions: [
      {
        id: 'tsa1',
        type: 'ordre',
        concept: 'Chaîne d’acquisition numérique',
        ask: "Ordonnez correctement les 4 blocs d'une chaîne d'acquisition numérique d'un signal analogique :",
        ordre_correct: [
          'Filtrage analogique anti-repliement (passe-bas)',
          'Échantillonnage à la fréquence $f_e > 2 f_{\\max}$',
          'Quantification sur $N$ bits',
          'Codage binaire du mot numérique',
        ],
        why: "Le filtre anti-repliement limite impérativement la bande **avant** l'échantillonnage (théorème de Shannon), puis vient la quantification en amplitude et enfin le codage binaire.",
      },
      {
        id: 'tsa2',
        type: 'calcul',
        concept: 'Théorème de Shannon-Nyquist',
        ask: "Un signal modulé occupe la bande $[0; 12{,}5\\,\\text{kHz}]$. Quelle est la fréquence d'échantillonnage minimale $f_{e,\\min}$ (en kHz) pour éviter tout repliement de spectre ?",
        reponse_numerique: 25,
        unite: 'kHz',
        tolerance: 0.05,
        why: 'Le critère de Nyquist-Shannon impose $f_e > 2 f_{\\max} = 2 \\times 12{,}5 = 25\\,\\text{kHz}$.',
      },
      {
        id: 'tsa3',
        type: 'vrai_faux',
        concept: 'Stabilité BIBO en Z',
        ask: "Un filtre numérique causal de fonction de transfert $H(z)$ est stable au sens BIBO si et seulement si tous ses pôles vérifient $|p_k| < 1$.",
        opts: ['Vrai', 'Faux'],
        ans: 0,
        why: "Vrai : pour un système causal discret, la région de convergence contient le cercle unité $|z|=1$ si et seulement si tous les pôles sont strictement à l'intérieur du disque unité.",
      },
      {
        id: 'tsa4',
        type: 'qcm',
        concept: 'Filtre RIF (FIR)',
        ask: 'Quelle propriété caractérise systématiquement un filtre numérique RIF (à réponse impulsionnelle finie) ?',
        opts: [
          'Il est toujours stable (pôles uniquement en $z = 0$) et peut avoir une phase exactement linéaire',
          'Il nécessite toujours une boucle de rétroaction sur $y[n-k]$',
          'Il offre toujours une pente plus raide qu’un filtre RII à ordre égal',
          'Sa fonction de transfert possède des pôles sur le cercle unité',
        ],
        ans: 0,
        why: "Un filtre RIF s'écrit $H(z) = \\sum_{k=0}^{M} b_k z^{-k}$ : sans pôles hors de l'origine, il est inconditionnellement stable et peut être à phase linéaire si ses coefficients sont symétriques.",
      },
    ],
  },

  // =========================================================================
  // 3. ÉLECTRONIQUE NUMÉRIQUE & VHDL (VHDL + SVG + Calcul ±5% + Ordre)
  // =========================================================================
  {
    id: 'seed-vhdl-cours',
    matiere: 'Électronique Numérique & VHDL',
    chapitre: 'VHDL & Logique Séquentielle',
    type_source: 'Cours',
    origin: 'seed',
    questions: [
      {
        id: 'v1',
        type: 'qcm',
        concept: 'Processus synchrone VHDL',
        ask: 'Quel matériel est inféré par ce processus VHDL lors de la synthèse FPGA ?',
        code: `-- Processus séquentiel
process(clk, rst_n)
begin
    if rst_n = '0' then
        q <= (others => '0');
    elsif rising_edge(clk) then
        if en = '1' then
            q <= d;
        end if;
    end if;
end process;`,
        lang: 'vhdl',
        opts: [
          'Un registre (bascules D) avec reset asynchrone actif bas et validation synchrone `en`',
          'Un verrou (latch) combinatoire transparent',
          'Un registre avec reset synchrone actif haut',
          'Un multiplexeur purement combinatoire',
        ],
        ans: 0,
        why: '`rst_n` est dans la liste de sensibilité et testé avant `rising_edge(clk)` : c’est un reset **asynchrone** actif à `0`. `en` est testé dans le front montant : c’est un enable **synchrone**.',
      },
      {
        id: 'v2',
        type: 'calcul',
        concept: 'Timing synchrone · Fréquence maximale',
        ask: "Sur le chemin critique entre deux bascules D illustré ci-dessous, on donne $t_{cq} = 1{,}5\\,\\text{ns}$, $t_{\\text{comb}} = 6{,}5\\,\\text{ns}$ et $t_{\\text{su}} = 2{,}0\\,\\text{ns}$ (skew nul). Calculez la fréquence maximale d'horloge $f_{\\max}$ en MHz.",
        svg: `<svg viewBox="0 0 380 120" class="w-full max-w-md mx-auto">
  <rect x="16" y="22" width="64" height="72" rx="5" fill="var(--surface-2)" stroke="currentColor" stroke-width="1.8"/>
  <text x="48" y="48" text-anchor="middle" font-size="12" font-family="IBM Plex Mono, monospace" fill="currentColor">DFF 1</text>
  <polygon points="16,74 28,80 16,86" fill="none" stroke="var(--accent)" stroke-width="1.6"/>
  <text x="48" y="84" text-anchor="middle" font-size="10.5" font-family="IBM Plex Mono, monospace" fill="var(--dim)">tcq=1.5ns</text>
  <line x1="80" y1="54" x2="132" y2="54" stroke="currentColor" stroke-width="2"/>
  <rect x="132" y="30" width="116" height="48" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.8"/>
  <text x="190" y="51" text-anchor="middle" font-size="11.5" font-family="IBM Plex Mono, monospace" fill="currentColor">Logique Comb.</text>
  <text x="190" y="67" text-anchor="middle" font-size="11" font-family="IBM Plex Mono, monospace" fill="var(--accent)">tcomb = 6.5 ns</text>
  <line x1="248" y1="54" x2="298" y2="54" stroke="currentColor" stroke-width="2"/>
  <polygon points="292,49 300,54 292,59" fill="currentColor"/>
  <rect x="300" y="22" width="64" height="72" rx="5" fill="var(--surface-2)" stroke="currentColor" stroke-width="1.8"/>
  <text x="332" y="48" text-anchor="middle" font-size="12" font-family="IBM Plex Mono, monospace" fill="currentColor">DFF 2</text>
  <polygon points="300,74 312,80 300,86" fill="none" stroke="var(--accent)" stroke-width="1.6"/>
  <text x="332" y="84" text-anchor="middle" font-size="10.5" font-family="IBM Plex Mono, monospace" fill="var(--dim)">tsu=2.0ns</text>
</svg>`,
        reponse_numerique: 100,
        unite: 'MHz',
        tolerance: 0.05,
        why: 'La période minimale vaut $T_{\\min} = t_{cq} + t_{\\text{comb}} + t_{\\text{su}} = 1{,}5 + 6{,}5 + 2{,}0 = 10\\,\\text{ns}$, soit $$f_{\\max} = \\frac{1}{10\\times 10^{-9}} = 100\\,\\text{MHz}$$',
      },
      {
        id: 'v3',
        type: 'vrai_faux',
        concept: 'Signal vs Variable en VHDL',
        ask: "Dans un `process` VHDL, l'affectation d'un `signal` via `<=` prend effet immédiatement à la ligne suivante du même processus.",
        opts: ['Vrai', 'Faux'],
        ans: 1,
        why: "Faux : un `signal` (`<=`) n'est mis à jour qu'à la fin du `process` (cycle delta), contrairement à une `variable` (`:=`) qui est mise à jour immédiatement.",
      },
    ],
  },
  {
    id: 'seed-vhdl-annales',
    matiere: 'Électronique Numérique & VHDL',
    chapitre: 'Synthèse FPGA & Codage Binaire',
    type_source: 'Annales',
    origin: 'seed',
    questions: [
      {
        id: 'va1',
        type: 'ordre',
        concept: 'Flot de conception FPGA',
        ask: "Remettez dans l'ordre les étapes du flot de conception FPGA jusqu'au téléchargement sur la carte :",
        ordre_correct: [
          'Description RTL (VHDL) & simulation fonctionnelle',
          'Synthèse logique (conversion en LUT / bascules)',
          'Placement et routage (Place & Route)',
          'Génération du bitstream et programmation FPGA',
        ],
        why: 'On décrit et simule en RTL, puis on synthétise en netlist logique, on place/route sur les ressources physiques du FPGA, et enfin on génère le bitstream.',
      },
      {
        id: 'va2',
        type: 'calcul',
        concept: 'Complément à 2',
        ask: 'Quelle valeur décimale signée représente l’octet `1111_0110` codé en complément à 2 sur 8 bits ?',
        reponse_numerique: -10,
        unite: '(C2 8 bits)',
        tolerance: 0.05,
        why: 'Le bit de signe vaut 1 (nombre négatif). En inversant les bits on obtient `0000_1001` (9), puis $+1$ donne $10$, donc la valeur signée est $-10$.',
      },
      {
        id: 'va3',
        type: 'qcm',
        concept: 'Anti-latch combinatoire',
        ask: 'Dans un `process` combinatoire VHDL, comment évite-t-on la synthèse involontaire d’un verrou (latch) ?',
        opts: [
          'En affectant une valeur par défaut à toutes les sorties en début de `process` (ou dans chaque branche `else` / `when others`)',
          'En retirant les signaux lus de la liste de sensibilité',
          'En remplaçant tous les `signal` par `std_logic_vector`',
          'En ajoutant un `wait for 10 ns;`',
        ],
        ans: 0,
        why: "Un latch est inféré dès qu'une sortie n'est pas assignée dans un chemin d'exécution combinatoire, car le circuit doit alors mémoriser son ancienne valeur.",
      },
    ],
  },

  // =========================================================================
  // 4. ARCHITECTURE & ASSEMBLEUR (Assembly ARM + Ordre + Calcul ±5%)
  // =========================================================================
  {
    id: 'seed-asm-cours',
    matiere: 'Architecture & Assembleur',
    chapitre: 'ARM Cortex-M & Instructions',
    type_source: 'Cours',
    origin: 'seed',
    questions: [
      {
        id: 'a1',
        type: 'calcul',
        concept: 'Décalage logique & addition ARM',
        ask: 'Quelle valeur décimale contient le registre `r1` après exécution de cette séquence ARM Cortex-M ?',
        code: `    MOV r0, #6          ; r0 = 6
    LSL r1, r0, #2      ; décalage gauche de 2 bits
    ADD r1, r1, r0      ; r1 = r1 + r0`,
        lang: 'asm',
        reponse_numerique: 30,
        unite: '(décimal)',
        tolerance: 0.05,
        why: '`LSL r1, r0, #2` calcule $6 \\times 2^2 = 24$, puis `ADD r1, r1, r0` ajoute 6 : $24 + 6 = 30$ (astuce classique pour multiplier par 5 sans instruction `MUL`).',
      },
      {
        id: 'a2',
        type: 'qcm',
        concept: 'Registres spéciaux ARM',
        ask: 'Quel est le rôle du registre `LR` (`r14`) lors d’un appel de sous-programme via `BL ma_fonction` ?',
        code: `main:
    BL calcul_crc
    MOV r0, #0`,
        lang: 'asm',
        opts: [
          "Stocker l'adresse de retour (instruction suivant `BL`) pour revenir via `BX LR`",
          'Contenir le sommet de la pile système',
          'Mémoriser les drapeaux NZCV de l’UAL',
          'Pointer vers le début de la mémoire Flash',
        ],
        ans: 0,
        why: '`BL` (Branch with Link) sauvegarde l’adresse de l’instruction suivante dans le *Link Register* (`LR` = `r14`). La pile est pointée par `SP` (`r13`).',
      },
      {
        id: 'a3',
        type: 'ordre',
        concept: 'Pipeline RISC 5 étages',
        ask: "Remettez dans l'ordre les 5 étages classiques d'un pipeline RISC pour le traitement d'une instruction :",
        ordre_correct: [
          'IF — Fetch (chargement de l’instruction)',
          'ID — Decode (décodage et lecture registres)',
          'EX — Execute (calcul UAL / adresse)',
          'MEM — Memory (accès mémoire données)',
          'WB — Write-Back (écriture résultat registre)',
        ],
        why: "Le pipeline RISC canonique à 5 étages suit exactement la séquence IF → ID → EX → MEM → WB.",
      },
    ],
  },
  {
    id: 'seed-asm-annales',
    matiere: 'Architecture & Assembleur',
    chapitre: 'Boucles, Pile & Mémoire',
    type_source: 'Annales',
    origin: 'seed',
    questions: [
      {
        id: 'aa1',
        type: 'qcm',
        concept: 'Boucle & drapeaux NZCV',
        ask: 'Combien de fois le corps de la boucle `loop:` est-il exécuté ?',
        code: `    MOV r0, #4
loop:
    SUBS r0, r0, #1
    BNE loop`,
        lang: 'asm',
        opts: ['4 fois', '3 fois', '5 fois', 'Boucle infinie'],
        ans: 0,
        why: '`SUBS` met à jour le drapeau `Z` (Zero). `r0` passe par `3, 2, 1, 0` : `BNE` (Branch if Not Equal / `Z==0`) reboucle 3 fois, donc le corps s’exécute 4 fois au total.',
      },
      {
        id: 'aa2',
        type: 'vrai_faux',
        concept: 'Architecture Load/Store',
        ask: "En assembleur ARM (architecture Load/Store), l'instruction `ADD` peut directement additionner deux valeurs stockées en mémoire RAM sans passer par des registres.",
        opts: ['Vrai', 'Faux'],
        ans: 1,
        why: "Faux : en architecture RISC Load/Store, seuls `LDR` et `STR` accèdent à la mémoire ; toutes les opérations arithmétiques (`ADD`, `SUB`, `AND`...) travaillent exclusivement sur des registres.",
      },
    ],
  },
];
