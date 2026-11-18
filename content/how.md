# How to use

You are training one skill. Before any code, say what the state means, in one sentence. The sentence names a subproblem and the quantity in it. Coding happens on LeetCode, after that. This page has no editor.

## One card

The first card is Tasks in a line. Task i pays `pay[i]`. Taking it skips the next `skip[i]` tasks. You may also skip a task. The tiny input is `pay = [2, 1, 5, 3]`, `skip = [1, 2, 1, 0]`.

Write a sentence, then Commit. The first commit is the graded one.

Two cells appear. The second label is the free comparison. On this card it says "most you can be paid from task 2 onward." That tells you the anchor, from a task onward, and the quantity, most pay.

Suppose you wrote `dp[i] = most pay from the first i tasks`. The label is not about the first i tasks. It is about what remains from task 2. That sentence does not match. Tag it wrong anchor.

A sentence that matches the label names most pay from task i onward. Leave it untagged. No tag means you think the sentence is right. `No miss` records that choice, so a blank tag line is not the same as a forgotten tag.

Check cells tests the numbers, not the wording. Both cells have to match. On an ordinary day the next card stays shut until they do. On this diagnostic you may open the next sentence first. The set still does not finish until every card's cells match.

Hints stay shut until you commit, the clock ends, or you give up. Hint 4 is the full official sentence, and taking it is a miss. The diagnostic does not offer hint 4. A remembered editorial of a later test should not be available here.

## A day

The left margin is the day, one block at a time. The current line is in ink.

- Retrieval. An older problem, text only. Write the sentence again. Then mark the block done.
- Cold. Yesterday's idea, before today's lesson. The sentence is due in 15 minutes. Code it on LeetCode after that.
- Cards. Three problems. Each is a sentence, then two cells.
- Lesson. Read up to the table. Fill every cell. Check the table. The rest stays hidden until the cells match. Then mark the block done.
- Check. Four cards from the family you just finished. Three of four, with no hint 4, is a rough signal. Fewer than that, and the next two days stay on this family.
- Rule. One sentence in your own words. Commit closes the day.

The first day of a family has no cold solve. Later days put the cold solve before the lesson.

Short day is retrieval, two cards, and a rule. A check stays four cards. Two short days in a row do not reset the count. The next full day stays on that family. Skipping a scheduled day does reset it. Sunday does not. The day rolls at 04:00 IST.

## When you are stuck

If the cells do not match, the sentence's numbers are wrong for this input, or a cell was misread. Hints open after the commit. Hint 1 asks for the repeated decision. Hint 2 asks what the next decision still needs. Hint 3 shows a tiny input and asks which two situations your state treats as the same. It does not name the rejected state.

Give up opens the hints and the commit is not graded. I already know this swaps the card, once a day, after you type the name. The swap is not a success.

The clock reaching zero says "time." Hints open. You can still commit. A commit after a hint is kept and is not the graded one.

## The numbers

`3 days in a row` counts closed days. Sunday does not break the run. `closed 2 of 5 study days` appears after the first day you close. It is closed days over scheduled days since that start, skipping Sundays.

The line under the margin counts misses against graded commits. A tag that keeps appearing is the thing to reread.

- Too small. The next decision needs a fact the sentence forgot.
- Infeasible. The sentence keeps the set, the path, or the history, and it cannot fit the constraints. An extra dimension that still works is a non-minimal note, not a miss.
- Vague. The cells cannot be filled. "Best at i" is this.
- Wrong quantity. The table fills with the wrong kind of answer. Length where the question wants a count.
- Wrong anchor. Prefix where the dependency is ending-at, or a range.
- Transition. The state was right and the code was not. Use it only on a problem you code.

## The diary

This browser holds one diary. The id is printed under this page. A private window has a different id. Clearing site data starts a new diary. The old one stays on the server, and there is no way back to it from here.

Sentences is the list of committed sentences and rules.
