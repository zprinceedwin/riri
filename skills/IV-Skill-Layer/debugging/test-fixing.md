# test-fixing

Skill: a red test means the test or the code is wrong — find out which.

## When to use
Tests failing after a change, intermittent test failures, or inherited red suites.

## Core idea
Read the assertion before the implementation. If the test encodes the right behavior, fix the code. If the test is wrong, fix the test and say so. Never delete a failing test to make the suite green.
