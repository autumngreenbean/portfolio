# EP/BC-1 style CD player: v1 build spec

Nov 22, 2026 · @autumn

A tray-drive v1 is buildable from a Raspberry Pi Zero 2 W, a slim USB CD drive and two custom boards, and it can deliver playback, varispeed, three cue points and tempo sync out.

## Scope

v1 proves the electronics and firmware in a normal tray-load enclosure; the exposed-disc look comes in v2 once the drive is a known quantity.

**In v1:**

- Audio CD and MP3-disc playback from a slim USB optical drive
- Varispeed 50% to 150% with time stretch, jog wheel, three cue markers
- Beat detection with a tempo pulse on a 3.5 mm sync jack
- Red LED digits and two LED level meters, numpad and transport keys
- Line out and headphone out, USB-C charging, 1S LiPo
- Standard Bluetooth and CD-to-USB WAV ripping, since the Pi provides both nearly free

**Deferred:** exposed top-load disc with a bare mechanism, Auracast (needs a LE Audio module), USB audio out, docking with the EP-35, and the 16 mm height.

## Architecture

A Linux board does the heavy audio work, a Pico handles the front panel, and two custom PCBs tie it together.

| Subsystem | Choice | Why |
| --- | --- | --- |
| Compute | Raspberry Pi Zero 2 W on a 2x20 socket | No BGA layout; ships with Wi-Fi and Bluetooth 5.0 |
| Disc transport | Slim USB CD/DVD drive, tray removed later | Reads audio CDs over USB, no decoder chipset |
| USB hub | 4-port hub IC on the main board | Zero 2 W has one data port; need drive, flash, Pico |
| Front panel MCU | Raspberry Pi Pico, castellated | Keys, encoder, LED drivers, sync pulse; USB serial to the Pi |
| Audio | PCM5102A I2S DAC, TPA6132A2 headphone amp | Simple, no MCLK needed, ground-centred output |
| Display | 2x MAX7219 LED drivers | 8 digits plus two level meters |
| Power | USB-C, BQ24074 charger, TPS61088 5 V boost, MAX17048 gauge | Stand-alone charger needs no firmware |

The Pico connects over USB through the hub, not a UART: with Bluetooth on, the Zero 2 W's good UART is taken by the radio, and USB avoids that trap.

## Power budget

Continuous drive spin gives about 2.3 hours on a 4000 mAh cell, and spinning the drive down between buffered reads stretches that to about 3.7 hours. Every load figure below is an estimate; measure on the bench before sizing the cell.

| Load | Spinning drive (W at 5 V) | Buffered, drive mostly off (W at 5 V) |
| --- | --- | --- |
| Pi Zero 2 W under load | 1.5 | 1.5 |
| Slim optical drive | 2.5 | 0.6 |
| USB hub | 0.3 | 0.3 |
| DAC and headphone amp | 0.2 | 0.2 |
| LED displays | 0.5 | 0.5 |
| Pico and misc | 0.1 | 0.1 |
| **Total** | **5.1** | **3.2** |
| From battery at 90% boost efficiency | 5.7 | 3.6 |
| Runtime, 14.8 Wh cell at 90% usable | 2.3 h | 3.7 h |

Spin-up draws about 4.5 W for a second or two, so the boost converter and charger path must handle roughly 3 A from the cell at 3.3 V. Whole-track buffering in RAM is a firmware feature, not a hardware one, and it is the main lever on runtime. The real player claims six hours, so expect a gap unless the cell grows.

## Schematic sheets

Seven sheets on the main board, one on the UI board; each sheet can be drawn and checked on its own.

1. **Power input and charging.** USB-C receptacle with 5.1 k CC resistors (5 V sink only), ESD diode, BQ24074 with ILIM and ISET resistors, 10 k NTC on the cell, JST-PH battery connector, MAX17048 on I2C.
2. **5 V boost.** TPS61088 from the charger OUT node, about 1 uH inductor rated 8 A or more, feedback divider for 5.1 V, bulk caps. Keep this loop tight in layout.
3. **Switched rails.** Load switch for the drive's 5 V so firmware can power-cycle a stuck drive; a 3.3 V LDO for the DAC and Pico logic if the Pi's 3.3 V is not enough.
4. **USB hub.** 4-port hub IC, 12 MHz crystal, upstream to the Pi, ports for the drive, a USB-A flash socket and the Pico, ESD on each port.
5. **Pi interface.** 2x20 socket: 5 V in, I2S to the DAC, I2C to the gauge, shutdown button, DAC mute, drive power enable.
6. **Audio.** PCM5102A with SCK tied low, I2S format, mute pin to the Pi; TPA6132A2 headphone amp; two 3.5 mm jacks with switches; software volume.
7. **Front-panel connector.** FFC to the UI board carrying 5 V, 3.3 V, SPI, key matrix and encoder lines.
8. **UI board.** Pico, 74AHCT125 level shifter, two MAX7219 drivers, 8 digits plus 2x8 LED meter bars, a 5x6 key matrix with diodes, rotary encoder with switch, 3.5 mm sync jack with buffer and TVS.

## Pin map

Draft assignments with no conflicts across the two boards; check them against the Pi and Pico pinout diagrams before layout.

| Signal | Device | Pin / GPIO | Note |
| --- | --- | --- | --- |
| I2S BCLK | Pi | GPIO18 (pin 12) | to PCM5102A BCK |
| I2S LRCLK | Pi | GPIO19 (pin 35) | to PCM5102A LRCK |
| I2S data out | Pi | GPIO21 (pin 40) | to PCM5102A DIN |
| I2C SDA / SCL | Pi | GPIO2 / GPIO3 (pins 3, 5) | MAX17048 at 0x36 |
| Shutdown button | Pi | GPIO27 | gpio-shutdown overlay |
| DAC mute (XSMT) | Pi | GPIO22 | muted while Bluetooth is active |
| Drive power enable | Pi | GPIO23 | load switch EN |
| Charger status | Pi | GPIO25 | from BQ24074 CHG / PGOOD |
| LED SPI clock / data / load | Pico | GP18 / GP19 / GP17 | through 74AHCT125 to both MAX7219 |
| Key rows (5) | Pico | GP2 to GP6 | diode matrix |
| Key columns (6) | Pico | GP7 to GP12 |  |
| Encoder A / B / switch | Pico | GP13 / GP14 / GP15 |  |
| Sync out | Pico | GP20 | buffer, series resistor, TVS |
| Pi to Pico link | USB | hub port 3 | USB serial, not a UART |

## Key parts

Part numbers come from memory of what suits each job. Confirm each one against its datasheet, footprint and stock before you order; the CSV BOM carries the same list.

| Function | Candidate | Alternate | Check |
| --- | --- | --- | --- |
| Compute | Raspberry Pi Zero 2 W |  | Header version; USB data pads |
| Optical drive | Any 9.5 mm slim USB CD/DVD drive | Slim SATA drive plus SATA-USB bridge | Reads audio CDs in Linux |
| USB hub | WCH CH334F | Microchip USB2514B | Reference design, crystal |
| UI MCU | Raspberry Pi Pico | Pico 2 | Castellated pads |
| LED drivers | MAX7219 (2) |  | 5 V supply, level shifter |
| Level shifter | 74AHCT125 |  | Powered at 5 V |
| DAC | PCM5102A |  | SCK tied low, FMT low |
| Headphone amp | TPA6132A2 |  | Gain, load |
| Charger | BQ24074 | BQ25895 (I2C) | BATFET discharge current vs 3 A peak |
| Boost | TPS61088 | TPS61023 (lower power) | Inductor saturation current |
| Fuel gauge | MAX17048 |  | 1S only |
| Load switch | TPS22918 |  | Current limit for drive spin-up |
| Encoder | Bourns PEC11R, 24 detent |  | Shaft length for the jog knob |
| Cell | 1S LiPo pouch, about 5000 mAh, protected |  | Thickness 6 mm or less |

## PCB and enclosure

The main board fits a 4-layer stackup, and the UI board fits 2 layers, which keeps a hand-built one-off cheap and routable.

- **Board sizes.** The real player is 240 x 176 mm; keep both boards inside about 230 x 165 mm so the case matches that footprint.
- **Height.** A 9.5 mm slim drive plus the PCB stack means about 28 mm or more for v1. The real unit's 16 mm needs a bare mechanism, which is v2.
- **Boost layout.** Tight loop from input cap to inductor to output cap, solid ground underneath, and nothing sensitive within 15 mm of the inductor.
- **USB.** Route the hub's upstream and port pairs as 90 ohm differential, short, with ESD diodes at the connectors.
- **Audio.** I2S lines short and away from the boost; DAC and headphone amp share a quiet ground tied to the main ground at one point.
- **Front panel.** Mount LEDs and keys on the UI board facing up; LED digit windows and key caps are an enclosure job, not a PCB one.
- **Serviceability.** Socket the Pi and the Pico so a dead module swaps without rework.

## Software and bring-up

One daemon on Raspberry Pi OS Lite does the playback work; the Pico only reports keys and draws the display.

- **Reading and ripping:** libcdio-paranoia reads tracks into a RAM cache; the same path writes WAV files to a USB flash drive.
- **Beat grid:** aubio analyses each cached track once and stores beat times; the Pico turns the grid and the current speed into sync pulses.
- **Varispeed:** SoundTouch or Rubber Band's faster engine, tested early on the Zero 2 W because it is the CPU risk.
- **Audio out:** ALSA through the hifiberry-dac overlay; BlueZ sends A2DP and mutes the DAC while it is active.
- **Cues:** three markers per disc saved by disc ID.

**Bring-up order, retire risk before spinning boards:**

1. Pi, hub and drive on the bench: confirm an audio CD reads and plays.
2. PCM5102A breakout on I2S: confirm clean line out.
3. Pico, MAX7219 modules and key matrix on perfboard with the real firmware.
4. Charger, boost and gauge on a small test board, measuring real current.
5. Spin the main and UI boards, then integrate.

## Open risks

- **Time stretch on the Zero 2 W.** If it stutters, move to a Compute Module or Pi 5-class board; the carrier then changes.
- **Drive spin-up current.** Some slim drives want more than a hub port gives; the dedicated switched rail covers it, but measure.
- **BATFET rating.** Check the BQ24074's discharge path against the 3 A peak, or switch to the BQ25895 route.
- **Sync pulse standard.** Read the K.O. II manual for pulse level and pulses per quarter note before fixing the sync jack circuit.
- **Auracast.** Needs a LE Audio capable radio module, not the Pi's Bluetooth 5.0.
- **Exposed-disc mechanism.** Removing the tray and clamping a disc by hand is its own mini project.
- **Beat accuracy.** Automatic beat detection fails on rubato and live material; expect to add a manual tap-tempo override.

## Sources

Specs of the original player come from launch coverage, 22 Nov 2026; the design above is independent and uses none of Teenage Engineering's firmware or schematics.

- [Darko.Audio: size, battery, USB and ripping](https://darko.audio/2026/11/teenage-engineerings-first-cd-player-runs-out-in-the-open/)
- [HiConsumption: varispeed, DJ tools, outputs](https://hiconsumption.com/tech/teenage-engineering-ep-bc-1/)
- [Dubspot: spec summary and dock](https://blog.dubspot.com/teenage-engineering-ep-bc-1-cd-player)
