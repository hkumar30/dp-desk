#!/usr/bin/env python3
from pathlib import Path

OUT = Path(__file__).resolve().parent / "lessons"
OUT.mkdir(exist_ok=True)

LESSONS = {
"f1d1": """# One index

A frog starts on the ground and wants step 5. A hop is 1 or 2 steps. How many ways?

The repeated decision is the last hop. After it, the future does not care about the earlier hops, only that you are standing on a step. Two different histories that land on step 3 have the same future.

`dp[i]` = the number of ways to reach step i. The answer is `dp[5]`.

`dp[0] = 1` (one way to stand still). `dp[1] = 1`. Then `dp[i] = dp[i - 1] + dp[i - 2]`.

Fill the table before you look below. Ways to reach step 2, and ways to reach step 5.

## Houses

Houses `[2, 7, 9, 3, 1]`. Robbing a house forbids the next one. Most money?

Three sentences:

- The set of robbed houses. Sufficient, and infeasible. The constraints will not pay for `2^n`.
- `(index, took previous)`. Sufficient, and interviewers would accept it. It is non-minimal: the bit is already encoded by whether you read `dp[i - 1]` or `dp[i - 2]`. That is a note, not a miss.
- `dp[i]` = the most money from the first `i` houses, ending at index `i - 1` in the usual 0-based row. Take `nums[i]` plus `dp[i - 2]`, or skip and keep `dp[i - 1]`. The answer is `dp[n - 1]`.

Count the states. One number per house is `O(n)`. The set is not.

Most from the whole row, and most from the first three houses.

<!-- reveal -->

The row is 1, 1, 2, 3, 5, 8. Step 2 is 2. Step 5 is 8.

```python
def ways(n):
    a, b = 1, 1
    for _ in range(n):
        a, b = b, a + b
    return a
```

`ways(5)` is 8. The function arguments are the state: `f(i)` needs only `i`.

`dp` is 2, 7, 11, 11, 12. The first three houses give 11. The row gives 12.

```python
def rob(nums):
    prev, curr = 0, 0
    for x in nums:
        prev, curr = curr, max(curr, prev + x)
    return curr
```
""",
"f1d2": """# A zero is not a new dimension

`226`. A digit string, decoded as 1 through 26. How many ways?

The decision at each cut is: take one digit, or take two if they form 10 through 26. After the cut, only the unused suffix matters, and the suffix is named by its start index.

`dp[i]` = ways to decode the first `i` characters. The answer is `dp[n]`.

A zero does not add a dimension. It makes some cuts illegal. `06` is not a code. `10` and `20` are codes only as pairs.

`dp[0] = 1`. If the string starts with 0, `dp[1] = 0`.

Ways to decode `226`, and ways to decode the prefix `2`.

<!-- reveal -->

`2` is one way. `22` is two ways: `2|2` and `22`. `226` is three: `2|2|6`, `22|6`, `2|26`.

```python
def num_decodings(s):
    if not s or s[0] == "0":
        return 0
    a, b = 1, 1
    for i in range(1, len(s)):
        nxt = b if s[i] != "0" else 0
        if 10 <= int(s[i - 1:i + 1]) <= 26:
            nxt += a
        a, b = b, nxt
    return b
```
""",
"f1d3": """# Ending here

`[-2, 1, -3, 4, -1, 2, 1, -5, 4]`. Largest sum of a contiguous run.

`dp[i]` = the best sum of the prefix `0..i` is the wrong sentence. It glues `-2` onto the `1` and cannot drop it.

`dp[i]` = the largest sum of a run that **ends at i**. Then you may start fresh at `nums[i]`, or extend the run that ended at `i - 1`. The answer is the max over `i`, not `dp[n - 1]`.

This is the first time the answer is not the last cell. Family 4 is this idea with a harder anchor.

Largest run in the row, and the largest run that ends at the first `4` (the one after `-3`).

<!-- reveal -->

The ending-here values include 4 at that cell. The best in the row is 6, from `4, -1, 2, 1`.

```python
def max_subarray(nums):
    best = ending = nums[0]
    for x in nums[1:]:
        ending = max(x, ending + x)
        best = max(best, ending)
    return best
```

A circle of houses, from yesterday, was not a new dimension. It was two copies of the line.
""",
"f2d1": """# The amount is what shrinks

Coins `[1, 3, 4]`, amount 6. Fewest coins, reuse allowed.

Greedy takes 4 and then two 1s: three coins. Two 3s are better. Greedy fails because it will not reconsider the leftover.

`dp[a]` = fewest coins that make amount `a`. A coin may be reused, so the coin is not a once-only index. `dp[0] = 0`. Anything you cannot make stays larger than the amount. The answer is `dp[6]`, or -1 if it never moved.

Count the states. One per amount, and each amount tries a handful of coins. That fits.

Fewest coins for 6, and fewest for 3.

<!-- reveal -->

`dp[3] = 1`. `dp[6] = 2`.

```python
def coin_change(coins, amount):
    inf = amount + 1
    dp = [0] + [inf] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return -1 if dp[amount] > amount else dp[amount]
```
""",
"f2d2": """# Each item once, written as a table

`[1, 5, 11, 5]`. Can a subset sum to 11?

Write the full table first. `dp[i][s]` = whether the first `i` numbers can make sum `s`. Each number is a row. In that row you may skip the number, or take it if `s` is large enough. You never read the row you are writing.

Can they make 11? Can they make 6?

<!-- reveal -->

Both are yes. 11 is the coin 11, or 5 + 5 + 1. 6 is 1 + 5.

The one-array version is that table with the previous row stored in the same memory. You walk the sums **downward** so the value you read is still the previous item. Upward would reuse the item. The direction is not a charm. It is the previous row.

```python
def can_sum(nums, target):
    dp = [True] + [False] * target
    for x in nums:
        for s in range(target, x - 1, -1):
            dp[s] = dp[s] or dp[s - x]
    return dp[target]
```

States: `n * target`. For these constraints that fits. The set of chosen indexes does not.
""",
"f2d3": """# The coin is in the state, or it is not

Coins `[1, 2]`, amount 4. Two questions.

Combinations: order does not count. `1 + 1 + 2` is the same combination as `2 + 1 + 1`.

Ordered sequences: those are different.

An amount-only sentence, `dp[t]` = ways to make `t`, is enough for the ordered question. The transition tries every coin from the current amount, so every order appears.

That same sentence is **too small** for combinations. Nothing in it stops `1` then `2` and `2` then `1` from both being counted. The state that can refuse the second order is `(how many coin types you have considered, amount)`. Coin type `i` is finished before coin type `i + 1` starts. Rolling that table into one row is the loop with the coin on the outside.

Fill both numbers: combinations for 4, and ordered sequences for 4.

<!-- reveal -->

Combinations: `(1,1,1,1)`, `(1,1,2)`, `(2,2)`. Three.

Ordered: those, plus the different orders of two 1s and a 2. There are five: four 1s; two 1s and a 2 in three positions; two 2s. Five.

```python
def combinations(coins, amount):
    dp = [1] + [0] * amount
    for c in coins:
        for a in range(c, amount + 1):
            dp[a] += dp[a - c]
    return dp[amount]

def permutations(nums, amount):
    dp = [1] + [0] * amount
    for a in range(1, amount + 1):
        for x in nums:
            if x <= a:
                dp[a] += dp[a - x]
    return dp[amount]
```
""",
"f2d4": """# The signs are a subset

Five 1s, each plus or minus, target 3. How many ways?

Let `P` be the sum of the positive group and `N` the rest. `P + N = total` and `P - N = target`, so `P = (total + target) / 2`. Here total is 5 and `P` is 4. If that is not an integer, or it exceeds the total, the answer is 0.

The state is the subset-count state from yesterday: `dp[s]` = number of subsets that sum to `s`, each number once. The answer is `dp[4]`.

Ways to hit the target, and the number of subsets that sum to 4. They are the same number.

<!-- reveal -->

`C(5, 4) = 5`.

```python
def find_target_sum_ways(nums, target):
    total = sum(nums)
    if (total + target) % 2 or abs(target) > total:
        return 0
    goal = (total + target) // 2
    dp = [1] + [0] * goal
    for x in nums:
        for s in range(goal, x - 1, -1):
            dp[s] += dp[s - x]
    return dp[goal]
```

Zeros are why the downward walk includes `s == x`. A zero is a real choice of side.
""",
"f3d1": """# Two positions

A 3 by 3 grid. Steps go down or right. How many walks from the top-left to the bottom-right?

`dp[r][c]` = walks that reach that cell. It is the cell above plus the cell to the left. The first row and the first column are 1s. The answer is the opposite corner.

The same skeleton with a sum, instead of a count: each cell adds its own cost, and you take the min of the two incoming cells. On `[[1,3,1],[1,5,1],[4,2,1]]` the answer is the bottom-right of that table.

Ways across the 3 by 3 grid, and the min path of that cost grid.

<!-- reveal -->

The count is 6. The min path is 7.

```python
def unique_paths(m, n):
    row = [1] * n
    for _ in range(1, m):
        for c in range(1, n):
            row[c] += row[c - 1]
    return row[-1]
```
""",
"f3d2": """# Start where the answer is one cell

Triangle `[[2],[3,4],[6,5,7],[4,1,8,3]]`. A path from the top to the bottom, moving to an adjacent cell on the next row. Minimum sum.

If you start at the top, every cell on the bottom is a possible end, and the answer is a min over them. If you start at the bottom, the cells are just themselves, and each cell above asks a question with one answer.

`dp[r][c]` = min path from that cell down to the bottom. `dp[r][c] = tri[r][c] + min(dp[r+1][c], dp[r+1][c+1])`. The answer is `dp[0][0]`.

The minimum for this triangle, and the bottom-left number, which is just 4.

<!-- reveal -->

The minimum is 11, along `2, 3, 5, 1`. The bottom-left cell is 4.

```python
def minimum_total(triangle):
    dp = triangle[-1][:]
    for r in range(len(triangle) - 2, -1, -1):
        for c in range(len(triangle[r])):
            dp[c] = triangle[r][c] + min(dp[c], dp[c + 1])
    return dp[0]
```
""",
"f3d3": """# The answer is not the corner

```
101
111
111
```

Largest square of 1s. Return the area.

`dp[r][c]` = the side of the largest square whose bottom-right corner is this cell. On a 0 it is 0. On a 1 it is one plus the minimum of the three cells above, left, and above-left. The answer is the **maximum** side, squared. The corner of the grid is not special.

Area, and the side sitting on the bottom-right cell.

<!-- reveal -->

The bottom-right side is 2. The largest side in the grid is 2. The area is 4.

This is an anchor: "ending here", the same idea as a run that ends at i. The grid's last cell is only one ending.
""",
"f3d4": """# One number, if you face the right way

The cave:

```
-2  -3   3
-5  -10  1
10   30 -5
```

Health starts at some positive integer and must stay at least 1 after every cell. Steps go right or down. What is the least health that can enter the top-left and survive?

Going forward, a path has a sum and a lowest dip. Those two numbers fight, and one cell cannot carry both. Face the exit. `dp[r][c]` = health needed **on entry** to this cell in order to reach the end alive.

`dp[r][c] = max(1, min(below, right) - dungeon[r][c])`. The bottom-right cell needs `max(1, 1 - value)`. Cells off the grid are infinite.

Entrance health, and the health needed to enter the bottom-right cell.

<!-- reveal -->

The bottom-right is `-5`, so you need 6 to enter it. The entrance needs 7.

```python
def calculate_minimum_hp(dungeon):
    m, n = len(dungeon), len(dungeon[0])
    dp = [[10**9] * (n + 1) for _ in range(m + 1)]
    dp[m][n - 1] = dp[m - 1][n] = 1
    for r in range(m - 1, -1, -1):
        for c in range(n - 1, -1, -1):
            dp[r][c] = max(1, min(dp[r + 1][c], dp[r][c + 1]) - dungeon[r][c])
    return dp[0][0]
```
""",
"f3d5": """# Two strings, subsequence only

`abcde` and `ace`. Longest common **subsequence**. The letters stay in order. They do not have to be contiguous.

`dp[i][j]` = that length for the prefixes of length i and j. A match takes the diagonal plus one. A mismatch takes the larger of the cell above and the cell to the left. A mismatch does **not** reset to 0. Resetting is the substring problem, and it is not this one.

The answer is the corner, `dp[m][n]`.

LCS of the two words, and LCS of `ab` with `a`.

<!-- reveal -->

The corner is 3. `ab` with `a` is 1.

To rebuild one subsequence, start at the corner and walk back. On a match, take the letter and step diagonally. On a mismatch, step toward the larger neighbor.

```python
def lcs(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp
```

The same table rolls down to two rows, because each cell reads only the previous row and the current row's left neighbor. Keep `prev` and `cur`. That is the usual follow-up. It is not a new state.
""",
"f3d6": """# Name the neighbor

`horse` into `ros`. Insert, delete, or replace one letter.

`dp[i][j]` = steps to turn the first i letters of `horse` into the first j letters of `ros`.

- Delete a letter from the first word: the cell above, `dp[i - 1][j]`.
- Insert a letter into the first word: the cell to the left, `dp[i][j - 1]`.
- Replace: the diagonal.

A match copies the diagonal and does not add one. The empty prefixes are `dp[i][0] = i` and `dp[0][j] = j`.

Distance of `horse` to `ros`, and distance of the single letter `h` to the empty word.

<!-- reveal -->

The corner is 3. `h` to nothing is 1, a deletion.

```python
def min_distance(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[m][n]
```
""",
"f4d1": """# The prefix sentence fails

`[10, 9, 2, 5, 3, 7, 101, 18]`. Longest strictly increasing subsequence, not necessarily contiguous.

Write the tempting sentence first: `dp[i]` = the longest increasing subsequence inside the prefix `i`. Now try to append `nums[i]`. You cannot tell whether you may. The prefix forgot the last value.

`dp[i]` = the longest increasing subsequence that **ends at i**. Then `nums[i]` is the last value, and you look at earlier `j` with `nums[j] < nums[i]`. The answer is the max over `i`, not `dp[n - 1]`. `dp[i]` starts at 1.

Length of the LIS, and the length of the one that ends at 7.

<!-- reveal -->

Ending at 7 the length is 4 (`2, 3, 5` is not the one; `2, 5, 3, 7` uses 2, 3 or 5, then 7, length 4). The maximum in the row is 4. The last cell, ending at 18, is shorter.

```python
def length_of_lis(nums):
    dp = [1] * len(nums)
    for i in range(len(nums)):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)
```

`O(n^2)` states, each looking backward. For `n` up to a few thousand that fits. The set of chosen indexes does not.
""",
"f4d2": """# Two numbers on the same anchor

`[1, 3, 5, 4, 7]`. How many distinct longest increasing subsequences?

The anchor does not change. You still end at `i`. One number is no longer enough, because "longest" and "how many" are different quantities.

`length[i]` and `count[i]`. Both start at 1. When `nums[j] < nums[i]`:

- if `length[j] + 1` is longer, replace `length[i]` and set `count[i] = count[j]`
- if it ties, add `count[j]` into `count[i]`

The answer is the sum of `count[i]` over every i whose length equals the maximum. It is not `count[n - 1]`.

How many longest subsequences, and the LIS length ending at 4.

<!-- reveal -->

Ending at 4 the length is 3? `1, 3, 4` has length 3. The two longest of the whole row are `1, 3, 5, 7` and `1, 3, 4, 7`. The count is 2. The length ending at 4 is 3.

```python
def find_number_of_lis(nums):
    length = [1] * len(nums)
    count = [1] * len(nums)
    for i in range(len(nums)):
        for j in range(i):
            if nums[j] < nums[i]:
                if length[j] + 1 > length[i]:
                    length[i] = length[j] + 1
                    count[i] = count[j]
                elif length[j] + 1 == length[i]:
                    count[i] += count[j]
    best = max(length)
    return sum(c for L, c in zip(length, count) if L == best)
```
""",
"f4d3": """# A different algorithm

This session is optional. The check does not use it.

The `O(n log n)` method for LIS length keeps a `tails` array: `tails[k]` is the smallest tail of any increasing subsequence of length `k + 1` found so far. For each number, binary-search the first tail that is greater or equal, and replace it, or append.

It returns the same length as `dp[i]` ending at i. It does not give you the count, and it is not a clearer state. It is a different algorithm interviewers ask for after the quadratic one is solid.

The length of `[10, 9, 2, 5, 3, 7, 101, 18]` is still 4. The subsequence ending at 2 has length 1.

<!-- reveal -->

Same answers as the quadratic table: 4, and 1.

```python
from bisect import bisect_left

def lis_length(nums):
    tails = []
    for x in nums:
        i = bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x
    return len(tails)
```
""",
"f4d4": """# A range, two quantities

`aaa`. How many slices are palindromes? Single letters count.

`dp[i][j]` is true when `s[i..j]` is a palindrome. The inner slice `s[i+1..j-1]` has to be known first, so `i` walks down or the length walks up. A slice of length 1 is true. Length 2 is true when the two letters match. The answer is the **count** of true cells, not `dp[0][n-1]`.

`bbbab`. Longest palindromic subsequence.

Same ranges. The quantity is now a length. Matching ends add 2 to the inside. Otherwise take the longer of the two sides. `dp[i][i] = 1`. The answer is `dp[0][n-1]`.

After that table exists, it is worth knowing the length equals the LCS of the string with its reverse. The range state comes first. The remark does not replace it.

Palindromic slices in `aaa`, and the subsequence length in `bbbab`.

<!-- reveal -->

`aaa` has 6 palindromic slices. `bbbab` has a palindromic subsequence of length 4.

```python
def count_substrings(s):
    n = len(s)
    dp = [[False] * n for _ in range(n)]
    total = 0
    for i in range(n - 1, -1, -1):
        for j in range(i, n):
            if s[i] == s[j] and (j - i < 2 or dp[i + 1][j - 1]):
                dp[i][j] = True
                total += 1
    return total
```
""",
"f4d5": """# The first cut

A stick of length 7. Cuts at 1, 3, and 4, in any order you choose. When you cut a piece, you pay its current length. Cheapest order?

Add the ends. The positions are `0, 1, 3, 4, 7`.

`dp[i][j]` = the cheapest way to finish every cut strictly between `c[i]` and `c[j]`. There is no cut between neighbors, so `dp[i][i+1] = 0`.

The cut you choose next is the **first** cut on that piece. It costs `c[j] - c[i]`, and the two sides become independent. That is the opposite of the balloon, where the chosen index is the last one removed.

Code it as `f(i, j)`. The arguments are the state. Memoize. Fill by increasing distance only if you would rather write loops.

Cost of the stick, and the cost of a segment that has no cut left inside it.

<!-- reveal -->

The empty segment costs 0. The stick costs 14.

```python
def min_cost(n, cuts):
    c = [0] + sorted(cuts) + [n]
    m = len(c)
    from functools import cache
    @cache
    def f(i, j):
        if j == i + 1:
            return 0
        return min(f(i, k) + f(k, j) for k in range(i + 1, j)) + c[j] - c[i]
    return f(0, m - 1)
```
""",
"f4d6": """# The last balloon

Balloons `[3, 1, 5]`. Bursting one scores the product of its current neighbors. Pad both ends with a 1 you never burst.

If `k` is the **first** balloon you burst, its neighbors change for everyone else, and the left and right are not separate problems.

If `k` is the **last** balloon burst between two still-standing balloons `i` and `j`, the score is `nums[i] * nums[k] * nums[j]`, and the open intervals `(i, k)` and `(k, j)` are independent. They were burst earlier.

`dp[i][j]` = the best score from bursting every balloon strictly between `i` and `j`. `dp[i][i+1] = 0`. The answer is `dp[0][n+1]` on the padded row.

`f(i, j)` is the way to write it. Fill a 3-balloon table before you trust the code.

Score of `[3, 1, 5]`, and score of `[3, 1, 5, 8]`.

<!-- reveal -->

`[3, 1, 5]` scores 35. `[3, 1, 5, 8]` scores 167.

```python
def max_coins(nums):
    a = [1] + nums + [1]
    n = len(a)
    from functools import cache
    @cache
    def f(i, j):
        if j - i < 2:
            return 0
        return max(f(i, k) + a[i] * a[k] * a[j] + f(k, j) for k in range(i + 1, j))
    return f(0, n - 1)
```
""",
"f5d1": """# One diagram, then a simpler special case

Prices `[7, 1, 5, 3, 6, 4]`.

One buy and one later sell: track the lowest price so far and the best difference. That is not a table of modes. The answer is 5.

As many buys as you like, holding at most one share, no fee and no rest day: every upward step is worth taking. Add `max(0, price[i] - price[i - 1])`. On this row that is also 7? Check it. `1→5` is 4, `3→6` is 3, total 7.

The mode shows up when a rule connects days: a fee, a forced rest, or a cap on the number of sales. Do not put the fee into the diagram today. A fee card is in the stack, and the posttest will not be that card.

One-transaction profit, and unlimited profit, on `[7, 1, 5, 3, 6, 4]`.

<!-- reveal -->

One transaction: 5. Unlimited: 7.

```python
def max_profit_one(prices):
    low, best = prices[0], 0
    for p in prices[1:]:
        best = max(best, p - low)
        low = min(low, p)
    return best

def max_profit_unlimited(prices):
    return sum(max(0, b - a) for a, b in zip(prices, prices[1:]))
```

At most two sales is four running numbers: first buy, first sell, second buy, second sell. A larger cap is the same list, longer. If the cap is at least `n / 2`, it never binds, and the unlimited sum is the answer.
""",
"f5d2": """# The rest day is a third mode

Prices `[1, 2, 3, 0, 2]`. After you sell, you must rest one day before you buy. At most one share.

Draw three nodes.

- `hold` comes from `hold`, or from `rest` minus today's price. It does not come from `sold`.
- `sold` comes only from yesterday's `hold` plus today's price.
- `rest` comes from `rest` or from `sold`.

The answer is the better of `sold` and `rest` at the end. You would not finish while forced to hold.

Profit on `[1, 2, 3, 0, 2]`, and profit on `[2, 1, 4, 7]`.

<!-- reveal -->

`[1, 2, 3, 0, 2]` gives 3: buy at 1, sell at 3, rest, and there is nothing left worth a second trade after the rest... buy at 0 after the rest is illegal if you sold at 3 on the previous pattern. The known result is 3.

`[2, 1, 4, 7]` gives 6, one buy at 1 and a sell at 7. The rest rule never gets in the way.

```python
def max_profit(prices):
    hold, sold, rest = -prices[0], 0, 0
    for p in prices[1:]:
        hold, sold, rest = max(hold, rest - p), hold + p, max(rest, sold)
    return max(sold, rest)
```
""",
"f6d1": """# What the parent needs

A tree. Root 3. Left child 2, with a child 3. Right child 3, with a child 1. You cannot rob a house and its child.

One number from a subtree is too small. The parent needs to know whether the child was robbed.

Return a pair.

- Robbed: this value, plus the not-robbed results of the children.
- Skipped: the best of each child's pair.

The answer is the better of the root's two numbers. `f(node)` returns the pair. The children are solved first.

The five-house tree, and a line `4, 1, 4` rooted at an end.

<!-- reveal -->

The tree is 7: the root and both grandchildren, `3 + 3 + 1`. The line `4, 1, 4` is 8.

```python
def rob(root):
    def f(node):
        if not node:
            return (0, 0)
        left, right = f(node.left), f(node.right)
        taken = node.val + left[1] + right[1]
        skipped = max(left) + max(right)
        return taken, skipped
    return max(f(root))
```
""",
"f6d2": """# The set is small enough to be the state

Three chores, `[2, 2, 3]`, a session holds 4 minutes. A chore is not split. Fewest sessions?

`n` is 3, so `2^3` masks fit. The future depends on which chores remain, and on how full the open session is.

`dp[mask] = (sessions used, minutes in the open session)`. Adding a chore either fits in the open session or opens a new one. Keep the lexicographically smaller pair. `dp[0] = (1, 0)` if you like to count the session you are about to fill, and read the session count of the full mask. The empty set can also be `(0, 0)`; be consistent about whether the first chore opens session 1.

Sessions for `[2, 2, 3]` with limit 4, and sessions for `[3, 3]` with limit 3.

<!-- reveal -->

`[2, 2]` fills one session and `3` needs another: 2. Two chores of 3 with limit 3 also need 2.

A 4-city trip is the same kind of state with a second index: `dp[mask][city]` = cheapest way to visit the set and finish in that city. Hand-fill it for four cities before you write the loop. `f(mask, city)` is the function.

```python
def min_sessions(tasks, limit):
    n = len(tasks)
    dp = [(n + 1, 0)] * (1 << n)
    dp[0] = (1, 0)
    for mask in range(1 << n):
        sessions, used = dp[mask]
        for i in range(n):
            if mask & (1 << i):
                continue
            if used + tasks[i] <= limit:
                cand = (sessions, used + tasks[i])
            else:
                cand = (sessions + 1, tasks[i])
            nxt = mask | (1 << i)
            if cand < dp[nxt]:
                dp[nxt] = cand
    return dp[(1 << n) - 1][0]
```
""",
}

for name, body in LESSONS.items():
    (OUT / f"{name}.md").write_text(body.strip() + "\n")
print(len(LESSONS), "lessons")
