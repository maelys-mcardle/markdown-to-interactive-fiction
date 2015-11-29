"use strict";

function showFirstStoryPage( story )
{
    // Show the first page of the first chapter.
    if ( story.chapters.length ) {
        showStoryPage( story, [], 0, 0 );
    }
}

function showStoryPage( story, previousChoices, chapterIndex, pageIndex )
{
    let chapter = story.chapters[ chapterIndex ];
    let page = chapter.pages[ pageIndex ];
    
    setStoryDay ( chapter.day );
    setStoryTime( page.time );
    setStoryLocation( page.location );
    setStoryContent( page.texts, previousChoices );
    setStoryChoices( page.links, story, previousChoices, chapterIndex, pageIndex );
    
    addEntryToHistory( story, previousChoices, chapterIndex, pageIndex );
        
    return true;
}

function setStoryDay( day )
{
    $( html.storyDay ).text( day );
}

function setStoryTime( time )
{
    $( html.storyTime ).text( time );
}

function setStoryLocation( location )
{
    $( html.storyLocation ).text( location );
}

function setStoryContent( texts, previousChoices )
{
    $( html.storyText ).empty();
    
    texts.forEach( function( text ) {
        addStoryText( text, previousChoices );
    });
}

function addStoryText( text, previousChoices )
{
    if ( !text.choice.id ||
         choiceInPreviousChoices( text.choice, previousChoices ) ) {
             
        // Append text as parsed markdown.
        $( html.storyText ).append( marked( text.content ) );
    }
}

function choiceInPreviousChoices( choiceToFind, allChoices )
{
    // If the choice to find has no target, there's nothing to look for.
    if ( !choiceToFind.target.found ) {
        return false;
    }
    
    // Look from the most recent choices backwards.
    for ( let choiceIndex = allChoices.length - 1;
              choiceIndex >= 0;
              choiceIndex++ ) {
    
        let choiceToCompare = allChoices[ choiceIndex ];
        
        // Match found if for the given chapter/page, the right ID
        // was selected. In case the individual returned to this page
        // many times, we only take the most recent choice.
        if ( choiceToFind.target.chapter === choiceToCompare.chapter &&
             choiceToFind.target.page === choiceToCompare.page ) {
        
            if ( caseInsensitive( choiceToFind.id ) === 
                 caseInsensitive( choiceToCompare.id ) ) {
             
                return true;
            
            } else {
            
                return false;
            
            }
        }
    }
    
    // No matches.
    return false;
}

function setStoryChoices( links, story, previousChoices, chapterIndex, pageIndex )
{
    $( html.storyChoices ).empty();
    
    if ( links.length === 0 ) {
        links = [{ 
            text: "No choices available.",
            target: { found: false }}];
    }
    
    links.forEach( function( link ) {
        addStoryChoice( link, story, previousChoices, chapterIndex, pageIndex );
    });
}

function addStoryChoice( link, story, previousChoices, chapterIndex, pageIndex )
{
    let linkElement = $( 
        '<a href="#" class="list-group-item">' + 
        link.text + 
        '</a>' );
 
    // No path. Mark the link as disabled.
    if ( link.target.found === false ) {
        linkElement.addClass("disabled");
    
    // Path specified. Create the link.
    } else {
        
        $( linkElement ).click( function() {
            
            // Setup the previous choices if the link is clicked.
            // The use of slice() makes the changes to a copy,
            // not the original array.
            let newPreviousChoices = previousChoices.slice();
            newPreviousChoices.push({ 
                chapter: chapterIndex,
                page: pageIndex,
                id: link.id });
                
            showStoryPage( story, newPreviousChoices, 
                link.target.chapter, link.target.page );
                
        });
    
    }
    
    // Add the element to the page.
    $( html.storyChoices ).append( linkElement );
}
