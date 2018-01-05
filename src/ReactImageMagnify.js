import detectIt from 'detect-it';
import objectAssign from 'object-assign';
import PropTypes from 'prop-types';
import React from 'react';
import ReactCursorPosition from 'react-cursor-position';
import requiredIf from 'react-required-if';

import DisplayUntilActive from './hint/DisplayUntilActive';
import EnlargedImage from './EnlargedImage';
import { getLensCursorOffset } from './lib/lens';
import Hint from './hint/DefaultHint';
import ShadedLens from './shaded-lens';
import ImageShape from './prop-types/ImageShape';
import { noop } from './utils';
import { INPUT_TYPE, ENLARGED_IMAGE_POSITION } from './constants';

class ReactImageMagnify extends React.Component {
    constructor(props) {
        super(props);

        const { primaryInput } = detectIt;
        const { mouse: MOUSE, touch: TOUCH } = INPUT_TYPE;

        this.state = {
            smallImageWidth: 0,
            smallImageHeight: 0,
            detectedInputType: {
                isMouseDeteced: primaryInput === MOUSE,
                isTouchDetected: primaryInput === TOUCH,
            },
            isActive: false,
        };

        this.onSmallImageLoad = this.onSmallImageLoad.bind(this);
        this.setSmallImageDimensionState = this.setSmallImageDimensionState.bind(this);
        this.onDetectedInputTypeChanged = this.onDetectedInputTypeChanged.bind(this);
        this.onActivationChanged = this.onActivationChanged.bind(this);
    }

    static propTypes = {
        className: PropTypes.string,
        enlargedImageContainerClassName: PropTypes.string,
        enlargedImageContainerStyle: PropTypes.object,
        enlargedImageClassName: PropTypes.string,
        enlargedImageStyle: PropTypes.object,
        fadeDurationInMs: PropTypes.number,
        hintComponent: PropTypes.func,
        shouldHideHintAfterFirstActivation: PropTypes.bool,
        isHintEnabled: PropTypes.bool,
        hintTextMouse: PropTypes.string,
        hinTextTouch: PropTypes.string,
        hoverDelayInMs: PropTypes.number,
        hoverOffDelayInMs: PropTypes.number,
        isActivatedOnTouch: PropTypes.bool,
        imageClassName: PropTypes.string,
        imageStyle: PropTypes.object,
        largeImage: ImageShape,
        lensStyle: PropTypes.object,
        pressDuration: PropTypes.number,
        pressMoveThreshold: PropTypes.number,
        smallImage: PropTypes.shape({
            alt: PropTypes.string,
            isFluidWidth: PropTypes.bool,
            src: PropTypes.string.isRequired,
            srcSet: PropTypes.string,
            sizes: PropTypes.string,
            width: requiredIf(PropTypes.number, props => !props.isFluidWidth),
            height: requiredIf(PropTypes.number, props => !props.isFluidWidth),
            onLoad: PropTypes.func,
            onError: PropTypes.func,
        }),
        style: PropTypes.object,
        enlargedImagePosition: PropTypes.oneOf([
            ENLARGED_IMAGE_POSITION.beside,
            ENLARGED_IMAGE_POSITION.over,
        ]),
        zoomWidth: PropTypes.number,
        zoomHeight: PropTypes.number,
    };

    static defaultProps = {
        fadeDurationInMs: 300,
        hintComponent: Hint,
        shouldHideHintAfterFirstActivation: true,
        isHintEnabled: false,
        hintTextMouse: 'Hover to Zoom',
        hintTextTouch: 'Long-Touch to Zoom',
        hoverDelayInMs: 250,
        hoverOffDelayInMs: 150,
    };

    componentDidMount() {
        const { smallImage: { isFluidWidth } } = this.props;

        if (!isFluidWidth) {
            return;
        }

        this.setSmallImageDimensionState();
        window.addEventListener('resize', this.setSmallImageDimensionState);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.setSmallImageDimensionState);
    }

    onSmallImageLoad(e) {
        const { smallImage: { onLoad = noop } } = this.props;

        onLoad(e);

        if (!this.props.smallImage.isFluidWidth) {
            return;
        }

        this.setSmallImageDimensionState();
    }

    setSmallImageDimensionState() {
        const { offsetWidth: smallImageWidth, offsetHeight: smallImageHeight } = this.smallImageEl;

        this.setState({
            smallImageWidth,
            smallImageHeight,
        });
    }

    onDetectedInputTypeChanged(detectedInputType) {
        this.setState({
            detectedInputType,
        });
    }

    onActivationChanged({ isActive }) {
        this.setState({
            isActive,
        });
    }

    getEnlargedImagePlacement() {
        const { enlargedImagePosition: userDefinedEnlargedImagePosition } = this.props;
        const { detectedInputType: { isTouchDetected } } = this.state;
        const computedEnlargedImagePosition = isTouchDetected
            ? ENLARGED_IMAGE_POSITION.over
            : ENLARGED_IMAGE_POSITION.beside;

        return userDefinedEnlargedImagePosition || computedEnlargedImagePosition;
    }

    render() {
        const {
            className,
            enlargedImageContainerClassName,
            enlargedImageContainerStyle,
            enlargedImageClassName,
            enlargedImageStyle,
            fadeDurationInMs,
            hintComponent: HintComponent,
            shouldHideHintAfterFirstActivation,
            isHintEnabled,
            hintTextMouse,
            hintTextTouch,
            hoverDelayInMs,
            hoverOffDelayInMs,
            isActivatedOnTouch,
            imageClassName,
            imageStyle,
            largeImage,
            lensStyle,
            pressDuration,
            pressMoveThreshold,
            smallImage: { isFluidWidth: isSmallImageFluidWidth, onError = noop },
            style,
            zoomWidth,
            zoomHeight,
        } = this.props;

        const { smallImageWidth, smallImageHeight, detectedInputType: { isTouchDetected } } = this.state;

        const fluidWidthSmallImage = objectAssign({}, this.props.smallImage, {
            width: smallImageWidth,
            height: smallImageHeight,
        });

        const fixedWidthSmallImage = this.props.smallImage;

        const smallImage = isSmallImageFluidWidth ? fluidWidthSmallImage : fixedWidthSmallImage;

        const fluidWidthContainerStyle = {
            width: 'auto',
            height: 'auto',
            fontSize: '0px',
            position: 'relative',
        };
        const fixedWidthContainerStyle = {
            width: `${smallImage.width}px`,
            height: `${smallImage.height}px`,
            position: 'relative',
        };
        const priorityContainerStyle = isSmallImageFluidWidth
            ? fluidWidthContainerStyle
            : fixedWidthContainerStyle;
        const compositContainerStyle = objectAssign(
            {
                cursor: 'crosshair',
            },
            style,
            priorityContainerStyle,
        );

        const fluidWidthSmallImageStyle = {
            width: '100%',
            height: 'auto',
            display: 'block',
            pointerEvents: 'none',
        };
        const fixedWidthSmallImageStyle = {
            width: `${smallImage.width}px`,
            height: `${smallImage.height}px`,
            pointerEvents: 'none',
        };
        const prioritySmallImageStyle = isSmallImageFluidWidth
            ? fluidWidthSmallImageStyle
            : fixedWidthSmallImageStyle;
        const compositSmallImageStyle = objectAssign({}, imageStyle, prioritySmallImageStyle);

        const enlargedImagePlacement = this.getEnlargedImagePlacement();

        const shouldShowLens = enlargedImagePlacement !== ENLARGED_IMAGE_POSITION.over && !isTouchDetected;

        const cursorOffset = getLensCursorOffset(smallImage, largeImage);

        return (
            <ReactCursorPosition
                {...{
                    className,
                    hoverDelayInMs,
                    hoverOffDelayInMs,
                    isActivatedOnTouch,
                    onActivationChanged: this.onActivationChanged,
                    onDetectedInputTypeChanged: this.onDetectedInputTypeChanged,
                    pressDuration,
                    pressMoveThreshold,
                    style: compositContainerStyle,
                }}
            >
                <img
                    {...{
                        src: smallImage.src,
                        srcSet: smallImage.srcSet,
                        sizes: smallImage.sizes,
                        alt: smallImage.alt,
                        className: imageClassName,
                        style: compositSmallImageStyle,
                        ref: el => (this.smallImageEl = el),
                        onLoad: this.onSmallImageLoad,
                        onError,
                    }}
                />
                {isHintEnabled && (
                    <DisplayUntilActive
                        {...{
                            shouldHideAfterFirstActivation: shouldHideHintAfterFirstActivation,
                        }}
                    >
                        <HintComponent
                            {...{
                                isTouchDetected,
                                hintTextMouse,
                                hintTextTouch,
                            }}
                        />
                    </DisplayUntilActive>
                )}
                {shouldShowLens && (
                    <ShadedLens
                        {...{
                            cursorOffset,
                            fadeDurationInMs,
                            smallImage,
                            style: lensStyle,
                        }}
                    />
                )}
                <EnlargedImage
                    {...{
                        containerClassName: enlargedImageContainerClassName,
                        containerStyle: enlargedImageContainerStyle,
                        cursorOffset,
                        fadeDurationInMs,
                        imageClassName: enlargedImageClassName,
                        imageStyle: enlargedImageStyle,
                        imagePosition: enlargedImagePlacement,
                        largeImage,
                        smallImage,
                        zoomWidth,
                        zoomHeight,
                    }}
                />
            </ReactCursorPosition>
        );
    }
}

export default ReactImageMagnify;
