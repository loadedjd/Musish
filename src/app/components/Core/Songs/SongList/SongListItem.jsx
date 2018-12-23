import React from 'react';

import { ContextMenuTrigger, MenuItem } from 'react-contextmenu';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { DragSource } from 'react-dnd';
import { createMediaItem, isPlaying, getTime, artworkForMediaItem } from '../../../../utils/Utils';
import classes from './SongList.scss';
import { MENU_TYPE } from './SongList';
import withMK from '../../../../hoc/withMK';
import SongDecoration from './SongDecoration';
import DragDropType from '../../../../utils/Constants/DragDropType';

function collect(collectProps, el) {
  const { props, playSong, queueNext, queueLater } = el;
  const { song } = props;
  const { attributes } = song;

  const inLibrary = attributes.playParams.isLibrary;

  const artworkURL = artworkForMediaItem(song, 60);

  const render = (
    <>
      <div className={'item-info'}>
        <div className={'artwork'}>
          <div className={'artwork-wrapper'}>
            <img src={artworkURL} alt={attributes.name} />
          </div>
        </div>
        <div className={'description'}>
          <h1>{attributes.name}</h1>
          <h2>{attributes.artistName}</h2>
          <h3>{attributes.albumName}</h3>
        </div>
      </div>

      <MenuItem divider />

      <MenuItem onClick={playSong}>Play</MenuItem>
      <MenuItem onClick={queueNext}>Play next</MenuItem>
      <MenuItem onClick={queueLater}>Play later</MenuItem>

      <MenuItem divider />

      <MenuItem onClick={() => null}>Show Artist</MenuItem>
      <MenuItem onClick={() => null}>Show Album</MenuItem>
      {!inLibrary && (
        <>
          <MenuItem divider />

          <MenuItem onClick={() => null}>Add to library</MenuItem>
        </>
      )}
    </>
  );

  return {
    ...collectProps,
    render,
  };
}

class SongListItem extends React.Component {
  constructor(props) {
    super(props);

    this.playSong = this.playSong.bind(this);
    this.pauseSong = this.pauseSong.bind(this);
    this.queueNext = this.queueNext.bind(this);
    this.queueLater = this.queueLater.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  async playSong() {
    const music = this.props.mk.instance;
    await music.setQueue({
      startPosition: this.props.index,
      items: this.props.songs.map(song => createMediaItem(song)),
    });
    await music.player.play();
  }

  async pauseSong() {
    await this.props.mk.instance.player.pause();
  }

  async queueNext() {
    await this.props.mk.instance.player.queue.prepend({
      items: [createMediaItem(this.props.song)],
    });
  }

  async queueLater() {
    await this.props.mk.instance.player.queue.append({ items: [createMediaItem(this.props.song)] });
  }

  async handleClick() {
    if (this.isPlaying()) {
      this.pauseSong();
    } else {
      this.playSong();
    }
  }

  isPlaying() {
    const { song } = this.props;

    return isPlaying(song);
  }

  renderIcon() {
    const { showAlbum, song } = this.props;

    return <SongDecoration song={song} showAlbum={showAlbum} />;
  }

  render() {
    const { showArtist, showAlbum, song, connectDragSource, isOver } = this.props;
    const { attributes } = song;
    const duration = getTime(attributes.durationInMillis);

    const explicit = attributes.contentRating === 'explicit' && (
      <div className={classes.explicit}>
        <span>E</span>
      </div>
    );

    return connectDragSource(
      <div
        className={cx(
          {
            [classes.indexedSong]: !showAlbum,
            [classes.playing]: this.isPlaying(),
            [classes.droppable]: isOver,
          },
          classes.song
        )}
        onClick={this.handleClick}
        style={this.props.style}
      >
        <ContextMenuTrigger
          id={MENU_TYPE}
          attributes={{ className: [classes.songWrapper] }}
          collect={props => collect(props, this)}
        >
          <div className={classes.songBacker} />
          {this.renderIcon()}
          <div className={classes.songInfo}>
            <span className={classes.songTitle}>
              {attributes.name}
              {explicit}
            </span>
            {(showArtist || showAlbum) && (
              <span>
                {showArtist && attributes.artistName}
                {showArtist && showAlbum && ' - '}
                {showAlbum && attributes.albumName}
              </span>
            )}
          </div>
          <span className={classes.songDuration}>
            <span>{duration}</span>
          </span>
        </ContextMenuTrigger>
      </div>
    );
  }
}

SongListItem.propTypes = {
  song: PropTypes.any.isRequired,
  index: PropTypes.number.isRequired,
  songs: PropTypes.array.isRequired,
  style: PropTypes.object,
  showArtist: PropTypes.bool.isRequired,
  showAlbum: PropTypes.bool.isRequired,
  mk: PropTypes.any.isRequired,
  connectDragSource: PropTypes.func.isRequired,
  isOver: PropTypes.bool,
};

SongListItem.defaultProps = {
  style: {},
  isOver: false,
};

const bindings = {
  [MusicKit.Events.mediaItemDidChange]: 'mediaItem',
  [MusicKit.Events.playbackStateDidChange]: 'playbackState',
};

const dndSpec = {
  beginDrag(props) {
    return {
      song: props.song,
    };
  },
};

function dndCollect(connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
  };
}

export default DragSource(DragDropType.SONG, dndSpec, dndCollect)(withMK(SongListItem, bindings));
