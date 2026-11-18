# After the posttest

These are not in the eight weeks.

## Regex and wildcards

LeetCode 10 and 44 are two-string tables with ugly transitions. In 10, `*` applies to the previous character, so you read the pattern two letters at a time. In 44, `*` stands alone and may eat a run. Do them back to back, on paper, only after edit distance is dull.

## Splitting into k parts

410 and 1335. The state is `(items considered, parts used)`. The transition chooses where the current part ends. `n * k * n` has to fit. When it does not, 410 also has a binary search on the answer. That search is not the DP.

## Minimax on an interval

486 and 375. `dp[i][j]` is the best score the player to move can force on that interval. The transition is a min or a max over the opponent's reply. It is the interval state with a different quantity. Write `f(i, j)` first.
