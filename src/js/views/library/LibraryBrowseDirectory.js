
import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import Link from '../../components/Link';
import Header from '../../components/Header';
import List from '../../components/List';
import TrackList from '../../components/TrackList';
import GridItem from '../../components/GridItem';
import DropdownField from '../../components/Fields/DropdownField';
import Icon from '../../components/Icon';
import URILink from '../../components/URILink';
import ErrorBoundary from '../../components/ErrorBoundary';

import * as helpers from '../../helpers';
import * as uiActions from '../../services/ui/actions';
import * as mopidyActions from '../../services/mopidy/actions';
import * as spotifyActions from '../../services/spotify/actions';

class LibraryBrowseDirectory extends React.Component{

	constructor(props){
		super(props);
	}

	componentDidMount(){
		this.props.uiActions.setWindowTitle("Browse");
		this.loadDirectory();
	}

	componentWillReceiveProps(nextProps){

		// mopidy goes online
		if (!this.props.mopidy_connected && nextProps.mopidy_connected){
			this.loadDirectory(nextProps);
		}

		// our uri changes
		if (nextProps.uri && nextProps.uri !== this.props.uri){
			this.loadDirectory(nextProps);
		}
	}

	loadDirectory(props = this.props){
		if (props.mopidy_connected){
			var uri = null
			if (props.uri !== undefined){
				uri = props.uri;
			}
			this.props.mopidyActions.getDirectory(uri);
		}
	}

	playAll(e, tracks){
		var tracks_uris = helpers.arrayOf('uri',tracks);
		this.props.mopidyActions.playURIs(tracks_uris, "iris:browse:"+this.props.uri);
		this.props.uiActions.hideContextMenu();
	}

	goBack(e){
		window.history.back();
		this.props.uiActions.hideContextMenu();
	}

	renderBreadcrumbs(){

		if (this.props.uri){
			var parent_uri = this.props.uri;
		} else {
			return null;
		}

		if (parent_uri.startsWith('file://')){
			var uri = parent_uri.replace('file:///','');
			var uri_elements = uri.split('/');

			return (
				<h4>
					{uri_elements.map((uri_element, index) => {

						// Reconstruct a URL to this element
						var uri = "file://";
						for (var i = 0; i <= index; i++){
							uri += "/"+uri_elements[i];
						}

						return (
							<span key={uri}>
								{index > 0 ? <span>&nbsp; <Icon type="fontawesome" name="angle-right" /> &nbsp;&nbsp;</span> : null}
								<URILink type="browse" uri={uri}>
									{decodeURI(uri_element)}
								</URILink>
							</span>
						);
					})}
				</h4>
			);
		}

		return null;
	}

	renderSubdirectories(subdirectories){
		if (this.props.view == 'list'){
			return (
				<List
					nocontext
					rows={subdirectories}
					className="library-local-directory-list"
					link_prefix={'/library/browse/'}
					nocontext={true}
				/>
			);
		} else {
			return (
				<div className="grid category-grid">
					{
						subdirectories.map(subdirectory => {
							return (
								<GridItem
									key={subdirectory.uri}
									type="browse"
									link={'/library/browse/'+encodeURIComponent(subdirectory.uri)}
									item={subdirectory}
									nocontext={true}
								/>
							);
						})
					}
				</div>
			);
		}
	}

	render(){
		var title = 'Directory';
		var uri_exploded = this.props.uri.split(':');
		if (uri_exploded.length > 0){
			title = uri_exploded[0];
			title = title.charAt(0).toUpperCase() + title.slice(1);
		}

		if (!this.props.directory || helpers.isLoading(this.props.load_queue,['mopidy_browse'])){
			return (
				<div className="view library-local-view">
					<Header icon="music" title={title} uiActions={this.props.uiActions} />
					<div className="body-loader loading">
						<div className="loader"></div>
					</div>
				</div>
			)
		}

		var tracks = (this.props.directory.tracks && this.props.directory.tracks.length > 0 ? this.props.directory.tracks : null);
		tracks = helpers.sortItems(tracks, 'name');
		
		var subdirectories = (this.props.directory.subdirectories && this.props.directory.subdirectories.length > 0 ? this.props.directory.subdirectories : null);
		subdirectories = helpers.sortItems(subdirectories, 'name');

		var view_options = [
			{
				label: 'Thumbnails',
				value: 'thumbnails'
			},
			{
				label: 'List',
				value: 'list'
			}
		];

		var options = (
			<span>
				<DropdownField
					icon="visibility"
					name="View"
					value={this.props.view}
					options={view_options}
					handleChange={value => {this.props.uiActions.set({ library_directory_view: value }); this.props.uiActions.hideContextMenu()}}
				/>
				{tracks ? <a className="button button--no-hover" onClick={e => {this.props.uiActions.hideContextMenu(); this.playAll(e, tracks)}}>
					<Icon name="play_circle_filled" />Play all
				</a> : null }
				<a className="button button--no-hover" onClick={e => {this.props.uiActions.hideContextMenu(); this.goBack(e)}}>
					<Icon name="keyboard_backspace" />Back
				</a>
			</span>
		);

		return (
			<div className="view library-local-view">
				<Header options={options} uiActions={this.props.uiActions}>
					<Icon name="folder" type="material" />
					{title}
				</Header>
				<section className="content-wrapper">
					<ErrorBoundary>

						{this.renderBreadcrumbs()}

						{subdirectories ? this.renderSubdirectories(subdirectories) : null}

						{tracks ? <TrackList 
								tracks={this.props.directory.tracks}
								uri={"iris:browse:"+this.props.uri}
								className="library-local-track-list"
							/> : null }

					</ErrorBoundary>
				</section>
			</div>
		);
	}
}

const mapStateToProps = (state, ownProps) => {

	// Decode the URI, and then re-encode selected characters
	// This is needed as Mopidy encodes *some* characters in URIs (but not other characters)
	// We need to retain ":" because this a reserved URI separator
	var uri = decodeURIComponent(ownProps.match.params.uri);
	uri = uri.replace(/\s/g, '%20');	// space
	uri = uri.replace(/&/g, '%26');		// &
	uri = uri.replace(/\[/g, '%5B');	// [
	uri = uri.replace(/\]/g, '%5D');	// ]
	uri = uri.replace(/\(/g, '%28');	// (
	uri = uri.replace(/\)/g, '%29');	// )
	uri = uri.replace(/\#/g, '%23');	// #

	return {
		uri: uri,
		load_queue: state.ui.load_queue,
		mopidy_connected: state.mopidy.connected,
		directory: state.mopidy.directory,
		view: state.ui.library_directory_view
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		uiActions: bindActionCreators(uiActions, dispatch),
		mopidyActions: bindActionCreators(mopidyActions, dispatch),
		spotifyActions: bindActionCreators(spotifyActions, dispatch)
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(LibraryBrowseDirectory)