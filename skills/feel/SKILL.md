---
name: feel
description: Use before building, reviewing, or verifying motion and sound in a website, app, game, UI, or tool with a visual or terminal interface.
---

Read [the runtime contract](../cstack-mode/references/runtime.md) before executing this workflow.

# Feel

Read [the feel principle](../principle-feel/SKILL.md). Run only the branches the changed surface needs. The plugin builds no motion graphics.

## 1. Use named tokens

Find the project's named duration, easing, and spring tokens. Use them in every motion call. Define missing values in the project's token file, never at the call site.

When the project has no motion tokens, propose this small fallback set to the person before adopting it. These are starting values to tune on the real surface.

| Token | Value |
| --- | --- |
| `motion.duration.fast` | 100 ms |
| `motion.duration.change` | 200 ms |
| `motion.duration.panel` | 300 ms |
| `motion.ease.out` | cubic-bezier(0.16, 1, 0.3, 1) |
| `motion.ease.in` | cubic-bezier(0.4, 0, 1, 1) |
| `motion.spring.settle` | stiffness 500, damping 45, mass 1 |
| `motion.spring.overshoot` | stiffness 400, damping 22, mass 1 |

Translate spring parameters into the project's engine units in the token file. Check the changed motion calls for literal durations, curves, or spring parameters.

## 2. Shape UI motion

Use mostly 100 to 300 ms ease-out transitions, with exits shorter than entrances. Use springs for dragged or interrupted motion. Retarget from the current position and velocity when input interrupts it.

On the web, prefer named `transform` and `opacity` properties. Keep input available during motion. Under the platform's reduced-motion preference, remove travel, shake, and overshoot while preserving state feedback. An immediate state update is valid in this fallback.

Drive each changed state on the real interface. Reverse a transition midway, drag and release, and repeat input before it settles. Check that the latest action wins, then repeat with reduced motion enabled.

## 3. Shape game feel

Give actions anticipation, squash and stretch, and follow-through where they communicate intent or weight. Keep anticipation from delaying input acceptance.

On impact, trigger hit-stop, decaying shake, flash, purposeful particles, and audio on the same frame. Keep their strength in named project tokens.

Capture the action and inspect its timeline. Check the impact cues share one event, the shake decays, and follow-through settles. Repeat with reduced motion and confirm the action remains readable.

## 4. Time sound from motion

An agent cannot hear. Derive cue times from the motion's timing data, spring, or easing rather than hand-written frame numbers. Tag each cue by a real action:

- `cut` follows a full-frame change.
- `move` follows the frame of peak speed.
- `land` follows the frame motion stops, using the engine's settling threshold for a spring.
- `appear` follows an element that pops in.

Space hero sounds about four seconds apart. Exclude meme sounds. Use a real CC0 recording for a physical hit, never a synthesized beep.

Run an automated waveform and spectrogram check on each clip. Reject two distinct events, steady noise, or a click inside a whoosh. Allow at most two fix rounds, then hand unresolved clips to the person.

Compare exported cue times with the motion timeline. Hand the person about five timecodes for a final listen. Report the automated result and the pending listen, never that it sounds good.

## 5. Verify and review

The verifier fails feel verification only for a state change with no transition where the surface has motion elsewhere, or motion with no reduced-motion fallback. Apply the fallback exception from step 2.

Report hard-coded durations or curves and motion that cannot be interrupted as findings. Attach the real-interface evidence from the applicable branches above.

The reviewer adds a short feel note with the observed response, motion consistency, and any remaining findings or pending listen.
