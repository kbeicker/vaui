class AnnotationDetectionTrack {
    constructor() {
        this._map = new Map(); // frame => detection id
        this.enableState = true;
        this._frameRange = null;
        this.resetFrameRange();
    }

    resetFrameRange() {
        this._frameRange = [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];
    }

    expandFrameRange(frame) {
        this._frameRange[0] = Math.min(this._frameRange[0], frame);
        this._frameRange[1] = Math.max(this._frameRange[1], frame);
    }

    recomputeFrameRange() {
        this.resetFrameRange();
        for (let [ts0, detectionId] of this._map) {
            this.expandFrameRange(ts0);
        }
    }

    get frameRange() {
        return this._frameRange;
    }

    get map() {
        return this._map;
    }
}

class AnnotationDetectionContainer {
    constructor(folderId) {
        this._folderId = folderId;
        this._id0 = 0;

        this._trackMap = new Map(); // track id -> AnnotationDetectionTrack
        this._frameMap = new Map(); // frame -> Map(track id -> detections)

        this._added = new Map();
        this._edited = new Map();
        this._removed = new Map();
    }

    add(detection) {
        this._id0 = Math.max(this._id0, detection.id0);

        // Create frame if needed
        if (!this._frameMap.has(detection.ts0)) {
            this._frameMap.set(detection.ts0, new Map());
        }

        // Insert detection into frame
        this._frameMap.get(detection.ts0).set(detection.id1, detection);

        // Create track if needed
        if (!this._trackMap.has(detection.id1)) {
            this._trackMap.set(detection.id1, new AnnotationDetectionTrack());
        }

        // Insert detection ID into track's map
        let track = this._trackMap.get(detection.id1);
        track.map.set(detection.ts0, detection.id0);

        // Update track time range
        track.expandFrameRange(detection.ts0);
    }

    getAllItems() {
        return Array.from(this._trackMap.keys());
    }

    getDetection(id0) {
        for (let map of this._frameMap.values()) {
            for (let detection of map.values()) {
                if (id0 === detection.id0) {
                    return detection;
                }
            }
        }
    }

    getEnableState(id1) {
        return this._trackMap.get(id1).enableState;
    }

    toggleState(id1, enabled) {
        this._trackMap.get(id1).enableState = enabled;
        return this.copy();
    }

    getTrackFrameRange(id1) {
        return this._trackMap.get(id1).frameRange;
    }

    getNextTrackId() {
        if (this._trackMap.size) {
            return Math.max(...this._trackMap.keys()) + 1;
        } else {
            return 0;
        }
    }

    validateNewTrackId(trackId) {
        return !this._trackMap.has(trackId);
    }

    newTrack(trackId) {
        this._trackMap.set(trackId, new AnnotationDetectionTrack());
        return this.copy();
    }

    changeTrack(trackId, newTrackId) {
        if (trackId !== newTrackId) {
            // Reassign track in track map
            let track = this._trackMap.get(trackId);
            this._trackMap.set(newTrackId, track);
            this._trackMap.delete(trackId);

            // Update all detections
            for (let [ts0, map] of this._frameMap) {
                let detection = map.get(trackId);
                if (detection) {
                    detection.id1 = newTrackId;
                    map.delete(trackId);
                    map.set(newTrackId, detection);

                    if (!this._added.has(detection.id0)) {
                        this._edited.set(detection.id0, detection);
                    }
                }
            };
        }
        return this.copy();
    }

    removeTrack(trackId) {
        let track = this._trackMap.get(trackId);
        if (track) {
            for (let [ts0, detectionId] of track.map) {
                let frame = this._frameMap.get(ts0);
                this._remove(frame, trackId, detectionId);
            }
            this._trackMap.delete(trackId);
        }
        return this.copy();
    }

    getByFrame(frame) {
        var trackDetectionMap = this._frameMap.get(frame);
        return trackDetectionMap ? Array.from(trackDetectionMap.values()) : [];
    }

    getByTrackId(trackId) {
        var track = this._trackMap.get(trackId);
        var frameRange = track.frameRange;
        var trackDetections = [];
        for (let i = frameRange[0]; i < frameRange[1] + 1; i++) {
            var map = this._frameMap.get(i);
            if (!map) {
                continue;
            }
            var detection = map.get(trackId);
            if (detection) {
                trackDetections.push(detection);
            }
        }
        return trackDetections;
    }

    isTrackEmpty(trackId) {
        return !this._trackMap.get(trackId).map.size;
    }

    get length() {
        return this._frameMap.size;
    }

    _getState(frame, trackId) {
        let track = this._trackMap.get(trackId);
        if (track) {
            return track.map.get(frame);
        }
        return undefined;
    }

    change(frame, trackId, attributes) {
        // Look up ID of possibly existing detection
        let detectionId = this._getState(frame, trackId);

        if (detectionId !== undefined) {
            // Detection already exists for the specified state; look it up and
            // modify it in place
            let detectionToChange = this._frameMap.get(frame).get(trackId);
            Object.assign(detectionToChange, attributes);

            // Update modification records; if state was added, it is still
            // added; otherwise, it is edited
            if (!this._added.has(detectionToChange.id0)) {
                this._edited.set(detectionToChange.id0, detectionToChange);
            }
        }
        else {
            // Entirely new detection; add it
            let newDetection = new AnnotationDetection({
                ...{
                    id0: ++this._id0,
                    id1: trackId,
                    ts0: frame,
                    folderId: this._folderId,
                    src: 'truth'
                },
                ...attributes
            });
            this.add(newDetection);

            // Update modification records; since there was no previous state,
            // this is an addition
            this._added.set(newDetection.id0, newDetection);
        }
        return this.copy();
    }

    changeAttributes(id0, attributes) {
        var detection = this.getDetection(id0);
        detection.occlusion = attributes.occlusion;
        detection.src = attributes.src;
        if (!this._added.has(detection.id0)) {
            this._edited.set(detection.id0, detection);
        }
        return this.copy();
    }

    _remove(trackIdToDetectionMap, trackId, detectionId) {
        // Update modification records; if state was added, just discard the
        // record; otherwise, add to removal records and ensure the state is
        // not in the edit records
        if (this._added.has(detectionId)) {
            this._added.delete(detectionId);
        }
        else {
            let detection = trackIdToDetectionMap.get(trackId);

            this._edited.delete(detectionId);
            this._removed.set(detectionId, detection);
        }

        // Finally, remove the detection from the frame
        trackIdToDetectionMap.delete(trackId);
    }

    remove(frame, trackId) {
        // Look up ID of detection
        let detectionId = this._getState(frame, trackId);

        if (detectionId !== undefined) {
            let track = this._trackMap.get(trackId);
            track.map.delete(frame);
            track.recomputeFrameRange();

            this._remove(this._frameMap.get(frame), trackId, detectionId);
        }
        return this.copy();
    }

    getAdded() {
        return [...this._added.values()];
    }

    getEdited() {
        return [...this._edited.values()];
    }

    getRemoved() {
        return [...this._removed.values()];
    }

    reset() {
        this._added.clear();
        this._edited.clear();
        this._removed.clear();
        return this.copy();
    }

    copy() {
        return Object.assign(new this.constructor(this._folderId), this);
    }
}

class AnnotationDetection {
    constructor(detection) {
        this.id0 = 0;
        this.id1 = 0;
        this.ts0 = 0;
        this.ts1 = 0;
        this.g0 = null;
        this.src = 'truth';
        Object.assign(this, detection);
    }
}

function annotationDetectionParser(folderId, detections) {
    var annotationDetectionContainer = new AnnotationDetectionContainer(folderId);
    for (let detection of detections) {
        var annotationDetection = new AnnotationDetection(detection);
        annotationDetectionContainer.add(annotationDetection);
    }
    return annotationDetectionContainer;
}

export {
    AnnotationDetection,
    AnnotationDetectionContainer
};
export default annotationDetectionParser;
