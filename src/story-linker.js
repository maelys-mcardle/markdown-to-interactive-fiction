"use strict";

function parseTargets( story )
{   
    // Traverse story and process the targets in links/choices.
    story.chapters.forEach( function( chapter, chapterIndex ) {
        chapter.pages.forEach( function( page, pageIndex ) {
            
            // Process links.
            page.links.forEach( function( link, linkIndex ) {
                story = processLinkOnPage( story, chapterIndex, 
                    pageIndex, linkIndex, link );
            });
            
            // Process choices.
            page.texts.forEach( function( text, textIndex ) {
                story = processChoiceOnPage( story, chapterIndex, 
                    pageIndex, textIndex, text );
            });
        });
    });
    
    return story;
}

function createTarget( path, found, chapter, page )
{
    return {
        path: path,
        found: found,
        chapter: chapter,
        page: page,
    };
}

function processLinkOnPage( story, chapterIndex, pageIndex, linkIndex, link )
{
    // Grab the target address.
    link.target = processTarget( story, chapterIndex, pageIndex, link.target );
    
    // Update the link.
    story.chapters[ chapterIndex ].pages[ pageIndex ].links[ linkIndex ] = link;
    
    return story;
}

function processChoiceOnPage( story, chapterIndex, pageIndex, textIndex, text )
{
    // Grab the target address.
    text.choice.target = processTarget( story, chapterIndex, pageIndex, 
        text.choice.target );
    
    // Update the text.
    story.chapters[ chapterIndex ].pages[ pageIndex ].texts[ textIndex ] = text;
    
    return story;
}

function processTarget( story, chapterIndex, pageIndex, target )
{
    /*
     *  Target Examples:
     * 
     *     last
     *     next
     *     next #2
     *     [Day]
     *     [Time]
     *     [Time] #2
     *     [Day] > [Time]
     *     [Day] > [Time] : [Location]
     *     [Day] > [Time] : [Location] #2
     *
     */
     
    // Make path case insensitive.
    let path = caseInsensitive( target.path );
    let matchIncrement = getMatchIncrement( path );

    // Find the desired target.
    if ( !path ) {
        target = createTarget( path, false );
    } else if ( path === caseInsensitive( "next" ) ) {
        target = processRelativePath( story, chapterIndex, pageIndex, path, matchIncrement );
    } else if ( path === caseInsensitive( "last" ) ) {
        target = processRelativePath( story, chapterIndex, pageIndex, path, -matchIncrement );
    } else {
        target = processAbsolutePath( story, chapterIndex, pageIndex, path, matchIncrement );
    }
    
    return target;
}

function processRelativePath( story, chapterIndex, pageIndex, path, incrementOrDecrementBy )
{
    // For when you want to go up or down by a certain amount of pages from a
    // given chapter and page.
    
    let target = createTarget( path, false );
    
    for ( let count = 0; count < Math.abs( incrementOrDecrementBy ); count++ ) {
        target = getNextOrLastChapterAndPage( story, path, chapterIndex, 
            pageIndex, ( incrementOrDecrementBy >= 0 ) ? true : false );
    }
    
    return target;
}

function processAbsolutePath( story, chapterIndex, pageIndex, path, skipToMatchNo )
{
    // For when you want to jump to a specific page.
    
    // Default target.
    let target = createTarget( path, false );
    
    // Get the tokens.
    let tokens = path.split( ">" );
    
    // For each token, trim.
    tokens = tokens.map( function( token ) { return token.trim() });
    
    // Remove the match increment from the last token.
    if ( tokens.length > 0 ) {
        let lastToken = tokens[ tokens.length - 1 ];
        let positionOfNumberSign = lastToken.lastIndexOf( "#" );
        if ( positionOfNumberSign >= 0 ) {
            tokens[ tokens.length - 1 ] = 
                lastToken.substring( 0, positionOfNumberSign );
        }
    }
    
    // If there's one token, then it can be a chapter name or a page in the
    // current chapter. Look at the pages in the current chapter first, then
    // look at chapter names. If there's two tokens, then the first is a chapter
    // name and the second is a page name. Page names can be split in 
    // time: location, or just time.
    
    if ( tokens.length === 1 ) {
        
        target = locatePage( story, path, 
            chapterIndex, tokens[0], skipToMatchNo );
        
    } else if ( tokens.length === 2 ) {
        
        target = locateChapterAndPage( story, path, 
            tokens[0], tokens[1], skipToMatchNo );
        
    } else {
        
        // 3+ Tokens. This is unsupported right now.
        appendCodeWarning( path, 
            "Contains 3 or more tokens (tokens are separated with '>')." +
            "They are " + tokens.join(", ") + ". Only 1 or 2 tokens are " +
            "supported at this time.");        
    }
    
    return target;
}

function locatePage( story, path, chapterIndex, timeAndLocationToFind, skipToMatchNo )
{
}

function locateChapterAndPage( story, path, dayToFind, timeAndLocationToFind, skipToMatchNo )
{
}

function getMatchIncrement( path )
{
    // If the path ends with #<Number> then the match number to get is that
    // number, otherwise it's assumed to be the first match (1.)
    
    let positionOfNumberSign = path.lastIndexOf( "#" );
    
    if ( positionOfNumberSign >= 0 ) {
        let matchNumber = parseInt( path.slice( positionOfNumberSign + 1) );
        if ( Number.isInteger( matchNumber ) ) {
            return matchNumber;
        } else {
            // There's a # in a target, but no valid number that follows.
            // This should be identified as a malformed link.
            appendCodeWarning( path, 
                "Contains a #, but no number follows it. Instead " +
                "it's '" + path.substring( positionOfNumberSign ) + "'." +
                "Please remove the # or have a number follow it. Numbers " +
                "are used to say okay, I want the 2nd, 3rd, 4th, etc. match." );
        }
    }
    
    return 1;
}

function getNextOrLastChapterAndPage( story, path, initialChapterIndex, initialPageIndex, isNext )
{
    let incrementOrDecrementBy = ( isNext ) ? +1 : -1;
    
    // Start at the current chapter.
    // When this chapter is exhausted, go up or down one,
    // until all chapters have been explored.
    for ( let chapterIndex = initialChapterIndex; 
              chapterIndex >= 0 && 
              chapterIndex < story.chapters.length; 
              chapterIndex + incrementOrDecrementBy ) {
              
        // The initial page is, if we're on the same chapter we started with,
        // the immediate next or previous page. Otherwise, it's the first page
        // of the next chapter (if we're incrementing) or the last page of the 
        // previous chapter (if we're decrementing).
        let startPage = 
            ( chapterIndex === initialChapterIndex ) ?
                initialPageIndex + incrementOrDecrementBy :
                    ( isNext ? 
                        0 : 
                        story.chapters[ chapterIndex ].pages.length - 1 );
        
        // Go up or down a page, until all have been exhausted in this chapter.
        for ( let pageIndex = startPage;
                  pageIndex >= 0 &&
                  pageIndex < story.chapters[ chapterIndex ].pages.length; 
                  pageIndex + incrementOrDecrementBy ) {
                      
            if ( doesChapterAndPageExist( story, chapterIndex, pageIndex ) ) {
                return createTarget( path, true, chapterIndex, pageIndex );
            }
        }
    }

    return createTarget( path, false );
}

function doesChapterAndPageExist( story, chapterIndex, pageIndex )
{
    return ( ( 0 <= chapterIndex < story.chapters.length ) &&
             ( 0 <= pageIndex < story.chapters[ chapterIndex ].pages.length ) );
}
