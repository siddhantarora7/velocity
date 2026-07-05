# velocity

*Measure your soccer ball kick speed*

A YOLO model featuring Kalman filtering and a speed-estimation algorithm, alongside a clean UI/UX powered by FastAPI. Made for personal use and Hackclub Horizons.

## Motivation

The app was made to provide a reliable, appealing, and simple-to-use method of keeping a catalog of one's kick speeds, to document growth or simply measure kick speed for fun. The speed of a soccer ball is crucial in measuring a player's ability to strike a goal, clear defensively, or even play a long pass; as a result, measuring speed can be a helpful indicator in assessing these qualities.

## Tech Stack

- **Backend**: Python, FastAPI
- **Frontend**: React, TypeScript (JSX)
- **Computer Vision**: YOLOv8n (`ultralytics`), `cv2`
- **Database**: Primary: Postgres, Secondary: SQLite
- **Containerization**: Docker
- **Deployment**: Frontend: Vercel, Backend: HuggingFace Spaces (runs YOLO model efficiently)

## Frontend

The frontend was built using a reliable and highly customizable tech stack of React and TypeScript. This resulted in the usage of components (`/frontend/src/components`) and openly available UI components to enhance user feel.

The app features 5 main screens:

1. **Calibration**: the user uses sliders to provide the scale (meters/pixel) for their video
2. **History**: a collection of a logged-in user's past shots and statistics
3. **Processing**: a loading screen to signify the model running
4. **Results**: the kick's top speed, launch speed, etc.
5. **Upload**: an interface to upload an `.mp4` / `.mov` file

The above is paired with a nav-bar rendered through `App.tsx`.

The color scheme and design were kept consistent across all screens, i.e. hints of blue, glossy cards, Geist Sans font, and a modern, premium feel.

## Backend

Built using FastAPI for speed, simplicity, reliability, and the ability to use the docs feature to easily test the backend.

All API routes are served in `app.py`. The app uses jobs to offload model tasks while the frontend queries a `/GET` API to check whether processing is finished.

The following routes are handled:

1. `/upload`
2. `/frame`
3. `/analyze`
4. `/status`
5. `/result`
6. `/signup`
7. `/login`
8. `/shots`

These endpoints take a user's video (`/upload`), store it, run the speed-estimation pipeline, and output the status of the pipeline and the result. They also deal with simple authentication (using JWT and password hashing) via the `/signup` and `/login` endpoints.

## How It Works

Velocity is split into processes that communicate only via HTTP (`/GET`, `/POST`, etc.)

### Measurement Pipeline

The `/src` directory comprises all logic of the code including scale calibration, kick window detection, speed computation, and running the YOLO model using the `cv2` library.

Each stage in the pipeline goes onto the next:

1. **Detection** (`detection.py`, `pipeline.py`): Runs the YOLO model on each frame. Frames where the ball is missed are recorded as gaps rather than skipped, so later stages know a frame is missing.
2. **Tracking** (`tracking.py`): Feeds the positions into a constant-velocity Kalman filter which smooths detection jitter, and fills recorded gaps by projecting trajectory from the ball's last known velocity.
3. **Kick Detection** (`kick.py`): Uses the smoothed frames to find the kick using a sustained jump threshold. Returns the window of frames comprising the launch.
4. **Speed Estimation** (`speed.py`, `calibration.py`): Converts pixel motion to a real scale using the inputted calibration scale.

### Calibration

A video alone cannot estimate real speed. A scale is needed to accurately deduce the real-world distance a certain pixel distance maps to. The app implements this through the calibration screen, in which the user inputs the real-world distance between two points (for example, the width of a ball) which is then used as a scale.

### User Flow

1. **Upload**: The user uploads a `.mp4` or `.mov` video. The frontend sends a `/POST` request to the `/upload` FastAPI route. The backend stores it, fetches dimensions, and returns a `video_id` which the frontend uses (`/frame/{video_id}`) to display the first frame for calibration.
2. **Calibrate**: The user places two points and enters the distance between them.
3. **Analyze**: Once all input is given, the frontend sends a `/POST` request to the `/analyze` endpoint, which runs the above pipeline through the `_run` function. Since running a YOLO model may take a while, we offload this task onto the background and query it using `job_id`.
4. **Polling**: The `job_id` is used by the frontend to send `/GET` requests to the `/status` API to determine whether or not the clip has been processed. The pipeline is finished when `status` is `done`.
5. **Results**: When `done`, the frontend fetches `/GET /result/{job_id}` for the speeds and renders the computed data on the Results screen.

## Authentication and History

Auth is optional here. Accounts can be used to track results over time (no external integrations are supported).

On `/signup` or `/login`, we hash the password (`bcrypt`) and return a JWT (JSON Web Token). The frontend uses this token by attaching it to an `Authorization: Bearer <token>` header on later requests.

When a logged-in user runs a video on the pipeline, we use SQL to write a new row onto the `shots` table (top speed, launch speed, timestamp). The `/shots` endpoint then returns the user's saved kicks for the history screen.

## Attribution

Some UI Components derived from [21st.dev](https://21st.dev/community/components) and [Cult UI](https://www.cult-ui.com). All backend code, auth, deployment, containerization, designs done by hand, frontend and UI implementation aided by Claude Code and online components.
